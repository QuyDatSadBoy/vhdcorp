#!/usr/bin/env bash
# Smoke test bản mới sau reload (chạy trên server, đủ stack + LLM thật).
# Bao phủ: health, API, SEO, phân quyền, order-guard, voucher, agent A2A + chat SSE.
# Trả 0 nếu OK; khác 0 → deploy.sh rollback về bản cũ.
set -u
BE=http://localhost:8080; FE=http://localhost:3001; AG=http://localhost:8001
fail=0
ok()  { echo "  ✓ $1"; }
bad() { echo "  ✗ $1"; fail=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -m 15 "$1"; }
has()  { curl -s -m 15 "$1" | grep -q "$2"; }
# Health check CÓ warm-up: service (nhất là agent Python/uvicorn) mất vài giây khởi động
# sau reload — thử tối đa 12 lần × 3s (36s) trước khi coi là hỏng, tránh rollback oan.
code_retry() { local u=$1 want=${2:-200}; for _ in $(seq 1 12); do [ "$(code "$u")" = "$want" ] && return 0; sleep 3; done; return 1; }
has_retry()  { local u=$1 pat=$2; for _ in $(seq 1 12); do curl -s -m 15 "$u" | grep -q "$pat" && return 0; sleep 3; done; return 1; }

echo "[1] Health 3 service (có warm-up tối đa 36s)"
code_retry "$BE/api/health" && ok "BE" || bad "BE health"
code_retry "$FE/" && ok "FE" || bad "FE"
has_retry "$AG/.well-known/agent-card.json" "VHD" && ok "Agent A2A card" || bad "Agent card"

echo "[2] Trang public"
for p in / /products /posts /about /contact /cart; do
  [ "$(code $FE$p)" = 200 ] && ok "FE $p" || bad "FE $p"
done

echo "[3] API + dữ liệu"
has "$BE/api/products?page=1" '"records"' && ok "products" || bad "products"
has "$BE/api/products/suggest?q=ong" '"data"' && ok "suggest (unaccent)" || bad "suggest"
has "$BE/api/categories" '"data"' && ok "categories" || bad "categories"

echo "[4] SEO"
[ "$(code $FE/sitemap.xml)" = 200 ] && ok "sitemap" || bad "sitemap"
[ "$(code $FE/robots.txt)" = 200 ] && ok "robots" || bad "robots"
# Lấy slug 1 sản phẩm PUBLISHED bất kỳ (không hard-code slug demo — catalog có thể đổi)
PSLUG=$(curl -s -m 15 "$BE/api/products?pageSize=1" | grep -oE '"slug":"[^"]+"' | head -1 | cut -d'"' -f4)
{ [ -n "$PSLUG" ] && curl -s -m 15 "$FE/products/$PSLUG" | grep -q "application/ld"; } && ok "JSON-LD product ($PSLUG)" || bad "JSON-LD"

echo "[5] Phân quyền (chưa auth phải bị chặn)"
c=$(code $BE/api/users);           { [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "/users chặn ($c)" || bad "/users hở ($c)"
c=$(code $BE/api/orders);          { [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "/orders GET chặn ($c)" || bad "/orders hở ($c)"
c=$(code $BE/api/site-config/draft); { [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "/site-config/draft chặn ($c)" || bad "draft hở ($c)"

echo "[6] Đặt hàng cần đăng nhập"
oc=$(curl -s -o /dev/null -w '%{http_code}' -m 15 -X POST $BE/api/orders -H 'Content-Type: application/json' -d '{"name":"x","email":"x@x.com","phone":"0900000000","address":"y","items":[{"productId":1,"qty":1}]}')
{ [ "$oc" = 401 ] || [ "$oc" = 403 ]; } && ok "POST /orders chặn ($oc)" || bad "POST /orders hở ($oc)"

echo "[7] Voucher validate (public, mã sai → lỗi VN)"
curl -s -m 15 -X POST $BE/api/vouchers/validate -H 'Content-Type: application/json' -d '{"code":"KHONGCO","subtotal":100000}' | grep -q "không tồn tại" && ok "voucher lỗi VN" || bad "voucher"

echo "[8] Admin login phát cookie (cookie scope domain nên chỉ kiểm Set-Cookie ở localhost)"
resp=$(curl -s -D - -o /dev/null -m 15 -X POST $BE/api/auth/admin/login -H 'Content-Type: application/json' -H 'X-Session-Scope: admin' -d '{"email":"vhdcorp.contact@gmail.com","password":"admin123"}')
echo "$resp" | grep -qi "^HTTP.* 200" && ok "admin login 200" || bad "admin login"
echo "$resp" | grep -qi "set-cookie: admin_access_token" && ok "phát cookie admin (Secure)" || bad "không phát cookie"

echo "[9] Agent A2A + chat SSE (LLM thật)"
curl -s -m 45 -X POST $AG/a2a -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":"1","method":"message/send","params":{"message":{"role":"user","parts":[{"kind":"text","text":"xin chào"}]}}}' | grep -q '"kind"' && ok "A2A message/send" || bad "A2A"
curl -s -N -m 45 -X POST $AG/api/chat -H 'Content-Type: application/json' -H 'X-Chat-User: smoke' -d '{"message":"bên bạn bán gì?"}' 2>/dev/null | grep -q '"content"' && ok "chat SSE stream" || bad "chat SSE"

[ "$fail" = 0 ] && echo "[smoke] ✅ TẤT CẢ PASS" || echo "[smoke] ❌ CÓ LỖI — sẽ rollback"
exit $fail
