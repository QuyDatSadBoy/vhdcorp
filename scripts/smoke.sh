#!/usr/bin/env bash
# Smoke test bản mới sau reload — kiểm mọi service + luồng chính còn sống.
# Trả về 0 nếu OK, khác 0 nếu có gì hỏng (deploy.sh sẽ rollback).
set -u
BE=http://localhost:8080
FE=http://localhost:3001
AG=http://localhost:8001
fail=0
chk() { # tên | url | chuỗi-mong-đợi(optional)
  local name="$1" url="$2" want="${3:-}"
  local body code
  body=$(curl -s -m 15 -w $'\n%{http_code}' "$url" 2>/dev/null)
  code=$(echo "$body" | tail -1)
  if [ "$code" != "200" ]; then echo "  ✗ $name ($code)"; fail=1; return; fi
  if [ -n "$want" ] && ! echo "$body" | grep -q "$want"; then echo "  ✗ $name (thiếu '$want')"; fail=1; return; fi
  echo "  ✓ $name"
}
echo "[smoke] Health"
chk "BE health"       "$BE/api/health"
chk "FE trang chủ"    "$FE/"
chk "Agent A2A card"  "$AG/.well-known/agent-card.json" "VHD"
echo "[smoke] Dữ liệu + tính năng"
chk "API sản phẩm"    "$BE/api/products?page=1" '"records"'
chk "Suggest (unaccent)" "$BE/api/products/suggest?q=ong"
chk "Danh mục"        "$BE/api/categories"
chk "FE /products"    "$FE/products"
echo "[smoke] Bảo vệ (phải chặn khi chưa đăng nhập)"
code=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "$BE/api/users")
[ "$code" = "401" ] || [ "$code" = "403" ] && echo "  ✓ /api/users chặn ($code)" || { echo "  ✗ /api/users KHÔNG chặn ($code)"; fail=1; }
echo "[smoke] Agent chat (SSE stream)"
stream=$(curl -s -N -m 45 -X POST "$AG/api/chat" -H 'Content-Type: application/json' -H 'X-Chat-User: smoke' -d '{"message":"giá ống nhựa PVC D21?"}' 2>/dev/null)
echo "$stream" | grep -q '"content"' && echo "  ✓ Agent stream trả lời (SSE)" || { echo "  ✗ Agent không phản hồi"; fail=1; }
[ "$fail" = 0 ] && echo "[smoke] ✅ TẤT CẢ PASS" || echo "[smoke] ❌ CÓ LỖI"
exit $fail
