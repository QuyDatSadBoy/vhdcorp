#!/usr/bin/env bash
# ============================================================
# VHD Corp — LUỒNG PHÁT TRIỂN: kiểm thử ĐỦ ở local → rồi mới deploy lên server.
#
#   bash scripts/ship.sh              # kiểm thử local, KHÔNG deploy (mặc định)
#   bash scripts/ship.sh --deploy     # kiểm thử local, PASS hết thì deploy lên VPS
#   bash scripts/ship.sh --deploy --skip-e2e   # bỏ qua kiểm thử gọi model thật (nhanh)
#
# Vì sao cần: GitHub Actions của repo đang không chạy được (hết quota), nên cửa chắn
# duy nhất trước production là máy local. Script này thay cho CI: chạy ĐÚNG những
# phép thử mà CI từng chạy, cộng thêm kiểm thử đầu-cuối qua HTTP thật.
#
# Nguyên tắc: HỎNG BẤT KỲ BƯỚC NÀO LÀ DỪNG, không deploy. Không có bước nào "cảnh
# báo rồi bỏ qua" — đã gọi là cửa chắn thì phải chắn thật.
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DO_DEPLOY=0
SKIP_E2E=0
AGENT_PORT=8199          # cổng riêng cho agent kiểm thử, không đụng agent đang chạy (8001)
VPS="${VPS_HOST:-root@116.118.6.61}"
DEPLOY_BRANCH_="${DEPLOY_BRANCH:-develop}"

for arg in "$@"; do
  case "$arg" in
    --deploy) DO_DEPLOY=1 ;;
    --skip-e2e) SKIP_E2E=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Tham số không hiểu: $arg"; exit 2 ;;
  esac
done

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; BLUE=$'\033[34m'; DIM=$'\033[2m'; OFF=$'\033[0m'
step()  { echo -e "\n${BLUE}${BOLD}▶ $*${OFF}"; }
ok()    { echo -e "  ${GREEN}✓${OFF} $*"; }
fail()  { echo -e "  ${RED}✗ $*${OFF}"; }

FAILED=()
AGENT_PID=""

cleanup() {
  [ -n "$AGENT_PID" ] && kill "$AGENT_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT

# Chạy 1 bước kiểm thử: giữ log ra file, chỉ in đuôi khi hỏng (đỡ ngập màn hình).
run() {
  local name="$1"; shift
  local logf; logf="$(mktemp)"
  if "$@" >"$logf" 2>&1; then
    ok "$name"
  else
    fail "$name"
    echo "${DIM}$(tail -20 "$logf")${OFF}"
    FAILED+=("$name")
  fi
  rm -f "$logf"
}

echo "${BOLD}VHD Corp — kiểm thử trước khi phát hành${OFF}"
echo "${DIM}nhánh: $(git -C "$ROOT" rev-parse --abbrev-ref HEAD) · commit: $(git -C "$ROOT" rev-parse --short HEAD)${OFF}"

# ── 0. Cây làm việc phải sạch (deploy lấy code từ remote, không lấy file chưa commit)
step "0/5 Kiểm tra cây làm việc"
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  fail "còn thay đổi chưa commit — deploy kéo code từ remote nên những thay đổi này sẽ KHÔNG lên server"
  git -C "$ROOT" status --short | head -10
  FAILED+=("cây làm việc chưa sạch")
else
  ok "sạch"
fi

# ── 1. Agent (Python)
step "1/5 Agent — pytest"
run "pytest" bash -c "cd '$ROOT/agent' && .venv/bin/python -m pytest -q"

# ── 2. Backend (NestJS)
step "2/5 Backend — tsc + build"
run "tsc" bash -c "cd '$ROOT/be' && npx tsc --noEmit"
run "build" bash -c "cd '$ROOT/be' && yarn build"

# ── 3. Frontend (Next.js)
step "3/5 Frontend — tsc + lint + build"
run "tsc" bash -c "cd '$ROOT/fe' && npx tsc --noEmit"
run "lint" bash -c "cd '$ROOT/fe' && yarn lint"
run "build" bash -c "cd '$ROOT/fe' && yarn build"

# ── 4. Kiểm thử đầu-cuối: dựng agent thật rồi gọi qua HTTP (model thật, catalog thật)
if [ "$SKIP_E2E" = "1" ]; then
  step "4/5 Kiểm thử đầu-cuối — BỎ QUA (--skip-e2e)"
else
  step "4/5 Kiểm thử đầu-cuối trên agent thật (cổng $AGENT_PORT)"
  ( cd "$ROOT/agent" && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$AGENT_PORT" >/tmp/ship-agent.log 2>&1 ) &
  AGENT_PID=$!
  UP=0
  for _ in $(seq 1 40); do
    if curl -fsS -o /dev/null "http://127.0.0.1:$AGENT_PORT/agui/chat/health" 2>/dev/null; then UP=1; break; fi
    sleep 3
  done
  if [ "$UP" = "1" ]; then
    ok "agent khởi động"
    run "e2e (20 phép thử)" python3 "$ROOT/scripts/e2e-agent.py" --url "http://127.0.0.1:$AGENT_PORT"
  else
    fail "agent không khởi động được"
    echo "${DIM}$(tail -20 /tmp/ship-agent.log)${OFF}"
    FAILED+=("agent không khởi động")
  fi
  kill "$AGENT_PID" 2>/dev/null; AGENT_PID=""
fi

# ── 5. Kết luận + deploy
step "5/5 Kết luận"
if [ ${#FAILED[@]} -gt 0 ]; then
  fail "${#FAILED[@]} bước HỎNG: ${FAILED[*]}"
  echo -e "\n${RED}${BOLD}KHÔNG deploy.${OFF} Sửa xong rồi chạy lại."
  exit 1
fi
ok "toàn bộ kiểm thử PASS"

if [ "$DO_DEPLOY" != "1" ]; then
  echo -e "\n${GREEN}Local sạch.${OFF} Chạy ${BOLD}bash scripts/ship.sh --deploy${OFF} để đưa lên server."
  exit 0
fi

step "Deploy lên $VPS (nhánh $DEPLOY_BRANCH_)"
if ! command -v sshpass >/dev/null && [ -n "${SSHPASS:-}" ]; then
  fail "có SSHPASS nhưng thiếu lệnh sshpass"; exit 1
fi
SSH=(ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 "$VPS")
[ -n "${SSHPASS:-}" ] && SSH=(sshpass -e "${SSH[@]}")

# Bấm giờ trang chủ SUỐT quá trình deploy: phát hành mà khách gặp trang lỗi thì
# không thể gọi là thành công, nên phải đo chứ không tin là "chắc không sao".
PROBE_LOG="$(mktemp)"
(
  while :; do
    c=$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0' https://vhdcorp.com --max-time 10 2>/dev/null)
    echo "$c" >>"$PROBE_LOG"
    sleep 2
  done
) &
PROBE_PID=$!

# deploy.sh trên server tự sao lưu, smoke test và ROLLBACK nếu hỏng — không cần
# script này lo chuyện đó, chỉ cần chuyển đúng nhánh và đọc kết quả.
DEPLOY_RC=0
"${SSH[@]}" "cd /root/vhdcorp && git fetch origin '$DEPLOY_BRANCH_' -q && DEPLOY_BRANCH='$DEPLOY_BRANCH_' APP_DIR=/root/vhdcorp bash scripts/deploy.sh" 2>&1 | tail -25 || DEPLOY_RC=1

kill "$PROBE_PID" 2>/dev/null
TOTAL=$(wc -l <"$PROBE_LOG" | tr -d ' ')
BAD=$(grep -cv '^200$' "$PROBE_LOG" || true)
rm -f "$PROBE_LOG"

if [ "$DEPLOY_RC" != "0" ]; then
  fail "deploy HỎNG — server đã tự rollback về bản cũ (xem log trên)"
  exit 1
fi
ok "deploy xong"
if [ "${BAD:-0}" -gt 0 ]; then
  fail "trang chủ ĐỨT $BAD/$TOTAL lần trong lúc phát hành (khách sẽ gặp lỗi)"
  FAILED+=("gián đoạn khi phát hành")
else
  ok "trang chủ không đứt lần nào trong $TOTAL lượt kiểm suốt quá trình"
fi

step "Kiểm thử lại trên production"
run "e2e production" python3 "$ROOT/scripts/e2e-agent.py" --url https://vhdcorp.com/agent
if [ ${#FAILED[@]} -gt 0 ]; then
  fail "production có vấn đề: ${FAILED[*]}"
  exit 1
fi
echo -e "\n${GREEN}${BOLD}✅ Đã phát hành: $(git -C "$ROOT" rev-parse --short HEAD)${OFF}"
