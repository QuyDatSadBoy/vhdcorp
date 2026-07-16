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

log() { echo -e "\n\033[1;34m[deploy]\033[0m $*"; }

cd "$APP_DIR"
PREV_SHA=$(git rev-parse HEAD)   # để rollback code nếu cần

# Sao lưu build hiện tại (rollback nhanh không cần build lại)
log "0/7 Sao lưu bản đang chạy (để rollback)"
rm -rf be/dist.bak fe/.next.bak
[ -d be/dist ] && cp -r be/dist be/dist.bak || true
[ -d fe/.next ] && cp -r fe/.next fe/.next.bak || true

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
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

# Từ đây nếu bất kỳ bước nào lỗi → rollback
trap rollback ERR

log "2/7 Backend: cài deps + migrate + build"
cd "$APP_DIR/be"
yarn install --frozen-lockfile
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
yarn install --frozen-lockfile
yarn build                    # cần ~2GB RAM — VPS bật swap (docs/DEPLOY.md)

log "4/7 Agent: đồng bộ môi trường Python"
cd "$APP_DIR/agent"
uv sync --frozen

log "5/7 Reload services qua PM2"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.js --update-env

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
