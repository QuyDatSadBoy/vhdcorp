#!/usr/bin/env bash
# ============================================================
# VHD Corp — deploy production trên VPS (idempotent, chạy lại thoải mái)
# Dùng bởi: GitHub Actions (tự động khi push) HOẶC chạy tay: bash scripts/deploy.sh
# Yêu cầu VPS đã setup 1 lần theo docs/DEPLOY.md (node, uv, pm2, docker postgres, .env)
# ============================================================
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/vhdcorp}"
BRANCH="${DEPLOY_BRANCH:-main}"

log() { echo -e "\n\033[1;34m[deploy]\033[0m $*"; }

cd "$APP_DIR"

log "1/6 Kéo code mới nhất (nhánh $BRANCH)"
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"   # chuyển hẳn sang nhánh production, sạch
git reset --hard "origin/$BRANCH"

log "2/6 Backend: cài deps + migrate + build"
cd "$APP_DIR/be"
yarn install --frozen-lockfile
yarn prisma:generate
# migrate deploy: chỉ APPLY migration đã commit — không tạo mới, an toàn production
yarn prisma migrate deploy
yarn build

log "3/6 Frontend: cài deps + build production"
cd "$APP_DIR/fe"
yarn install --frozen-lockfile
# next build cần ~2GB RAM — VPS 4GB nên bật swap (xem docs/DEPLOY.md)
yarn build

log "4/6 Agent: đồng bộ môi trường Python"
cd "$APP_DIR/agent"
uv sync --frozen

log "5/6 Khởi động lại services qua PM2"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save

log "6/6 Health check"
sleep 8
for url in "http://localhost:8080/api/health" "http://localhost:3001" "http://localhost:8001/.well-known/agent-card.json"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$url" || true)
  echo "  $url -> $code"
  [ "$code" = "200" ] || { echo "❌ $url không khỏe"; exit 1; }
done

log "✅ Deploy thành công: $(git rev-parse --short HEAD)"
