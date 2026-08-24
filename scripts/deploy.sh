#!/usr/bin/env bash
# ============================================================
# VHD Corp — deploy production trên VPS (idempotent + ROLLBACK).
# Dùng bởi: GitHub Actions (khi push main, sau khi test xanh) HOẶC chạy tay.
# An toàn: build bản mới → reload → smoke test. Nếu smoke FAIL → khôi phục
# build cũ + code cũ → server giữ nguyên bản đang chạy (không "sang bản lỗi").
# Yêu cầu setup lần đầu theo docs/DEPLOY.md (node, uv, pm2, postgres, nginx, .env).
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/vhdcorp}"
BRANCH="${DEPLOY_BRANCH:-main}"

# uv (quản lý môi trường Python của agent) cài ở ~/.local/bin — thư mục này KHÔNG có
# trong PATH của shell SSH không-đăng-nhập, nên chạy deploy qua `ssh host bash deploy.sh`
# sẽ chết ở bước 4 với "uv: command not found" (rollback lại bản cũ). Tự thêm vào PATH
# thay vì trông chờ người gọi export sẵn.
for d in "$HOME/.local/bin" "$HOME/.cargo/bin" /usr/local/bin; do
  [ -x "$d/uv" ] && case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH" ;; esac
done
export PATH

log() { echo -e "\n\033[1;34m[deploy]\033[0m $*"; }

# Chỉ cài lại thư viện khi lockfile thực sự đổi. Trước đây chạy mọi lần dù không thêm
# gói nào, mà `yarn install` kể cả lúc đã đủ vẫn tốn hàng chục giây quét lại cây phụ thuộc.
install_if_changed() {
  local lock="$1" stamp="$2"
  if [ -f "$stamp" ] && [ -f "$lock" ] && cmp -s "$lock" "$stamp"; then
    log "  ⤳ bỏ qua cài lại thư viện (lockfile không đổi)"
    return 1
  fi
  return 0
}

cd "$APP_DIR"
PREV_SHA=$(git rev-parse HEAD)   # để rollback code nếu cần

# Sao lưu build hiện tại (rollback nhanh không cần build lại)
log "0/7 Sao lưu bản đang chạy (để rollback)"
rm -rf be/dist.bak fe/.next.bak
# ĐỔI TÊN thay vì copy. Bản build frontend nặng 130MB nên copy tốn cả chục giây và
# ngần ấy dung lượng mỗi lần phát hành; đổi tên trong cùng ổ đĩa thì tức thời.
#
# Đã thử liên kết cứng (cp -al) và BỎ: nó thất bại im lặng trên thư mục .next — kiểm
# thấy số liên kết vẫn là 1 và bản dự phòng thiếu file, tức là rollback sẽ khôi phục
# một bản build hỏng. Rollback là thứ duy nhất cứu máy chủ khi deploy lỗi, không đánh
# cược nó để tiết kiệm mười giây.
#
# Không có .next trong lúc build cũng không sao: tiến trình đang chạy đã nạp code vào
# bộ nhớ, và pm2 chỉ reload SAU khi build xong.
[ -d be/dist ] && mv be/dist be/dist.bak || true
[ -d fe/.next ] && mv fe/.next fe/.next.bak || true

rollback() {
  log "⚠️  Lỗi — KHÔI PHỤC bản cũ (server tiếp tục chạy bản đang ổn định)"
  cd "$APP_DIR"
  git reset --hard "$PREV_SHA" || true
  rm -rf be/dist fe/.next
  [ -d be/dist.bak ] && mv be/dist.bak be/dist || true
  [ -d fe/.next.bak ] && mv fe/.next.bak fe/.next || true
  pm2 startOrReload ecosystem.config.js --update-env || true
  log "↩️  Đã rollback về $(git rev-parse --short HEAD). Bản mới KHÔNG được áp dụng."
  exit 1
}

log "1/7 Kéo code mới nhất (nhánh $BRANCH)"
git fetch origin "$BRANCH"

# Trạng thái CHẠY của máy chủ (chế độ trợ lý, kỹ năng admin tự thêm, cấu hình MCP,
# hạn mức chat) nằm trong agent/data. Đây là thiết lập của người vận hành, KHÔNG được
# để bản ở máy lập trình ghi đè.
#
# Cách làm: chuyển ra ngoài repo → kéo code → đưa về. Không dùng `git rm --cached` vì
# chỉ gỡ khỏi index thì git vẫn kẹt ở bước checkout (đã gặp cả hai kiểu lỗi thật:
# "local changes would be overwritten" khi file còn track, rồi "untracked files would
# be removed" sau khi gỡ). Đưa hẳn ra ngoài thì git không còn gì để tranh chấp.
RUNTIME_FILES="agent_mode.local.json skills.local.json mcp_servers.local.json chat_limits.local.json knowledge.local.md reply_cache.local.json usage_stats.local.json"
RUNTIME_STASH=$(mktemp -d)
for rf in $RUNTIME_FILES; do
  [ -f "agent/data/$rf" ] && cp -p "agent/data/$rf" "$RUNTIME_STASH/$rf"
done

restore_runtime() {
  for rf in $RUNTIME_FILES; do
    [ -f "$RUNTIME_STASH/$rf" ] && cp -p "$RUNTIME_STASH/$rf" "agent/data/$rf"
  done
  rm -rf "$RUNTIME_STASH"
}

for rf in $RUNTIME_FILES; do
  rm -f "agent/data/$rf"
done

git checkout -B "$BRANCH" "origin/$BRANCH"
# Lúc này agent/data đã trống các file thiết lập nên git không vướng gì
git reset --hard "origin/$BRANCH"
restore_runtime  # đưa thiết lập của máy chủ về đúng chỗ

# Từ đây nếu bất kỳ bước nào lỗi → rollback
trap rollback ERR

log "2/7 Backend: cài deps + migrate + build"
cd "$APP_DIR/be"
if install_if_changed yarn.lock node_modules/.deploy-lock; then
  yarn install --frozen-lockfile
  cp -f yarn.lock node_modules/.deploy-lock 2>/dev/null || true
fi
yarn prisma:generate
# Tự phục hồi migration FAILED của lần deploy trước (Postgres chạy migration trong
# transaction → fail là đã rollback vật lý; chỉ cần đánh dấu rolled-back rồi thử lại).
# Không resolve thì migrate deploy từ chối chạy mãi mãi → CI kẹt vĩnh viễn.
# Lưu ý: prisma in thông tin lỗi ra STDERR và exit≠0 khi có migration failed → phải 2>&1
FAILED_MIGRATIONS=$( (npx prisma migrate status 2>&1 || true) | sed -n '/have failed/,/^$/p' | grep -E '^[0-9]{14}_' || true)
for m in $FAILED_MIGRATIONS; do
  log "  ↻ resolve migration failed từ lần trước: $m"
  npx prisma migrate resolve --rolled-back "$m"
done
yarn prisma migrate deploy    # chỉ APPLY migration đã commit — an toàn production
yarn build

log "3/7 Frontend: cài deps + build production"
cd "$APP_DIR/fe"
if install_if_changed yarn.lock node_modules/.deploy-lock; then
  yarn install --frozen-lockfile
  cp -f yarn.lock node_modules/.deploy-lock 2>/dev/null || true
fi
yarn build                    # cần ~2GB RAM — VPS bật swap (docs/DEPLOY.md)

log "4/7 Agent: đồng bộ môi trường Python"
cd "$APP_DIR/agent"
if install_if_changed uv.lock .venv/.deploy-lock; then
  uv sync --frozen
  cp -f uv.lock .venv/.deploy-lock 2>/dev/null || true
fi

log "5/7 Reload services qua PM2"
cd "$APP_DIR"
# Nạp cấu hình mới (thêm/bớt tiến trình) rồi RELOAD LẦN LƯỢT.
# Thứ tự có chủ đích: backend và agent trước, frontend SAU CÙNG — trang web là thứ
# khách nhìn thấy, để nó đứt trong lúc chờ hai service kia khởi động là thừa.
# Frontend chạy 2 tiến trình nên `pm2 reload` thay từng cái, khách không thấy trang lỗi.
# pm2 KHÔNG đổi được số tiến trình / chế độ chạy của app đang sống — startOrReload
# giữ nguyên cái cũ và im lặng bỏ qua. Nếu cấu hình đòi chế độ khác thì phải xoá rồi
# tạo lại; chỉ làm khi thực sự lệch, và làm MỘT LẦN (các lần sau đã đúng chế độ nên
# reload lần lượt như bình thường).
WANT_MODE=$(node -p "((require('$APP_DIR/ecosystem.config.js').apps.find(a=>a.name==='vhd-fe')||{}).exec_mode)||'fork_mode'" 2>/dev/null || echo fork_mode)
HAVE_MODE=$(pm2 jlist 2>/dev/null | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).find(p=>p.name==='vhd-fe')?.pm2_env.exec_mode||''" 2>/dev/null || echo "")
if [ -n "$HAVE_MODE" ] && [ "${WANT_MODE/_mode/}" != "${HAVE_MODE/_mode/}" ]; then
  log "  ↻ vhd-fe đang chạy $HAVE_MODE nhưng cấu hình muốn $WANT_MODE → tạo lại (một lần)"
  pm2 delete vhd-fe >/dev/null 2>&1 || true
fi

pm2 startOrReload ecosystem.config.js --update-env
# Reload LẦN LƯỢT, frontend sau cùng (xem ghi chú thứ tự ở trên).
for app in vhd-be vhd-agent vhd-fe; do
  pm2 reload "$app" --update-env >/dev/null 2>&1 || pm2 restart "$app" --update-env >/dev/null 2>&1 || true
done

log "6/7 Smoke test bản mới"
sleep 8
if ! bash scripts/smoke.sh; then
  trap - ERR
  rollback
fi

log "7/7 Dọn backup + lưu PM2"
trap - ERR
rm -rf be/dist.bak fe/.next.bak
pm2 save

log "✅ Deploy thành công: $(git rev-parse --short HEAD)"
