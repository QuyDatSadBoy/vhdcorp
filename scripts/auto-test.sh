#!/usr/bin/env bash
# ===============================================================
# VHD Corp — End-to-end automated test
# ===============================================================
set -u
LOG="${1:-logs/auto-test.log}"
mkdir -p "$(dirname "$LOG")"

API="http://localhost:8080/api"
WEB="http://localhost:3000"
COOK=$(mktemp)
PASS=0
FAIL=0
FAILS=()

color_off='\033[0m'

stamp() { date +"%Y-%m-%d %H:%M:%S"; }
log()   { echo -e "$*" | tee -a "$LOG"; }
hr()    { log "------------------------------------------------------------"; }

check() {
  local name="$1"; local cond="$2"
  if [[ "$cond" == "ok" ]]; then
    PASS=$((PASS+1))
    log "  PASS  $name"
  else
    FAIL=$((FAIL+1))
    FAILS+=("$name :: $cond")
    log "  FAIL  $name  ($cond)"
  fi
}

# Returns "ok" if HTTP code matches expected, else returns the actual code
expect_code() {
  local method="$1" url="$2" expected="$3" extra="${4:-}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" -b "$COOK" -c "$COOK" $extra "$url")
  [[ "$code" == "$expected" ]] && echo "ok" || echo "expected $expected got $code"
}

# Returns "ok" if body contains pattern (regex)
expect_body() {
  local url="$1" pattern="$2"
  local body
  body=$(curl -s -b "$COOK" "$url")
  echo "$body" | grep -qE "$pattern" && echo "ok" || echo "missing pattern: $pattern"
}

> "$LOG"
log "===================================================================="
log "VHD Corp Auto-Test  ::  $(stamp)"
log "===================================================================="

hr; log "[1] Health & infrastructure"
check "BE :8080 listening"    "$(ss -tln 2>/dev/null | grep -q ':8080 ' && echo ok || echo not-listening)"
check "FE :3000 listening"    "$(ss -tln 2>/dev/null | grep -q ':3000 ' && echo ok || echo not-listening)"
check "Postgres :5432 listening" "$(ss -tln 2>/dev/null | grep -q ':5432 ' && echo ok || echo not-listening)"
check "GET /health 200"       "$(expect_code GET "$API/health" 200)"
check "GET /health body=ok"   "$(expect_body "$API/health" '"db":"up"')"

hr; log "[2] Public BE endpoints (no auth)"
for ep in "/products" "/products?pageSize=2" "/categories" "/posts" "/banners" "/site-config"; do
  check "GET $ep 200" "$(expect_code GET "$API$ep" 200)"
done
check "GET /products has records[]"  "$(expect_body "$API/products" '"records":\[')"
check "GET /products has totalItems" "$(expect_body "$API/products" '"totalItems":')"
check "GET /categories returns array" "$(expect_body "$API/categories" '"data":\[')"
check "GET /posts has records[]"      "$(expect_body "$API/posts" '"records":\[')"

hr; log "[3] Public BE detail endpoints"
SLUG=$(curl -s "$API/products?pageSize=1" | grep -oE '"slug":"[^"]+"' | head -1 | sed 's/.*:"//;s/"//')
PSLUG=$(curl -s "$API/posts?pageSize=1" | grep -oE '"slug":"[^"]+"' | head -1 | sed 's/.*:"//;s/"//')
CSLUG=$(curl -s "$API/categories" | grep -oE '"slug":"[^"]+"' | head -1 | sed 's/.*:"//;s/"//')
log "  product slug: $SLUG"
log "  post slug:    $PSLUG"
log "  category:     $CSLUG"
check "GET /products/slug/$SLUG 200"   "$(expect_code GET "$API/products/slug/$SLUG" 200)"
check "GET /posts/slug/$PSLUG 200"     "$(expect_code GET "$API/posts/slug/$PSLUG" 200)"
check "Product detail has price"  "$(expect_body "$API/products/slug/$SLUG" '"price"')"
check "Post detail has content"   "$(expect_body "$API/posts/slug/$PSLUG" '"content"')"

hr; log "[4] Auth flow — admin email/password login"
LOGIN_BODY=$(curl -s -c "$COOK" -X POST "$API/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"vhdcorp.contact@gmail.com","password":"admin123"}')
echo "$LOGIN_BODY" | grep -q '"role":"ADMIN"' && check "admin login returns ADMIN role" "ok" || check "admin login returns ADMIN role" "missing role:ADMIN"
check "access_token cookie set"  "$(grep -q access_token "$COOK" && echo ok || echo no-cookie)"
check "refresh_token cookie set" "$(grep -q refresh_token "$COOK" && echo ok || echo no-cookie)"
check "GET /auth/me 200"         "$(expect_code GET "$API/auth/me" 200)"
check "GET /auth/me email match" "$(expect_body "$API/auth/me" 'vhdcorp.contact@gmail.com')"

hr; log "[5] Bad-creds login should be 401"
BAD=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"vhdcorp.contact@gmail.com","password":"WRONG"}')
[[ "$BAD" == "401" || "$BAD" == "400" ]] && check "wrong password rejected (4xx)" "ok" || check "wrong password rejected (4xx)" "got $BAD"

hr; log "[6] Authenticated admin endpoints"
for ep in "/users" "/media" "/site-config/draft" "/statistics/overview" "/statistics/timeseries" "/reviews/admin"; do
  check "GET $ep auth 200" "$(expect_code GET "$API$ep" 200)"
done
check "/statistics/overview has products field" "$(expect_body "$API/statistics/overview" '"products":')"
check "/statistics/timeseries returns array"    "$(expect_body "$API/statistics/timeseries" '"date":')"

hr; log "[7] Auth required — unauthenticated should fail (4xx)"
NOAUTH=$(mktemp)
for ep in "/users" "/site-config/draft" "/statistics/overview" "/reviews/admin"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -c "$NOAUTH" "$API$ep")
  if [[ "$code" =~ ^4 ]]; then PASS=$((PASS+1)); log "  PASS  $ep blocked ($code)"
  else FAIL=$((FAIL+1)); FAILS+=("$ep not protected: $code"); log "  FAIL  $ep not blocked ($code)"; fi
done
rm -f "$NOAUTH"

hr; log "[8] CRUD round-trip on Category (create -> update -> delete)"
NEW=$(curl -s -b "$COOK" -X POST "$API/categories" \
  -H 'Content-Type: application/json' \
  -d '{"name":"AutoTest Cat","slug":"autotest-cat-'"$(date +%s)"'","order":99}')
NEW_ID=$(echo "$NEW" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
[[ -n "$NEW_ID" ]] && check "category created (id=$NEW_ID)" "ok" || check "category created" "no-id"
if [[ -n "$NEW_ID" ]]; then
  PUT_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK" -X PUT "$API/categories/$NEW_ID" \
    -H 'Content-Type: application/json' -d '{"name":"AutoTest Updated"}')
  [[ "$PUT_CODE" =~ ^2 ]] && check "PUT /categories/$NEW_ID ($PUT_CODE)" "ok" || check "PUT /categories/$NEW_ID" "$PUT_CODE"
  DEL_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -b "$COOK" "$API/categories/$NEW_ID")
  [[ "$DEL_CODE" == "200" || "$DEL_CODE" == "204" ]] && check "DELETE /categories/$NEW_ID ($DEL_CODE)" "ok" || check "DELETE /categories/$NEW_ID" "$DEL_CODE"
fi

hr; log "[9] SiteConfig draft + publish round-trip"
DRAFT=$(curl -s -b "$COOK" "$API/site-config/draft?key=main")
echo "$DRAFT" | grep -q '"key":"main"' && check "draft fetched" "ok" || check "draft fetched" "no-data"
SAVE_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK" -X PUT "$API/site-config/draft" \
  -H 'Content-Type: application/json' \
  -d '{"key":"main","value":{"brand":{"siteName":"VHD Corp Test"},"customCss":"/* auto-test */"}}')
[[ "$SAVE_CODE" =~ ^2 ]] && check "PUT /site-config/draft ($SAVE_CODE)" "ok" || check "PUT /site-config/draft" "$SAVE_CODE"

hr; log "[10] Logout invalidates session"
LOGOUT_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK" -c "$COOK" -X POST "$API/auth/logout")
[[ "$LOGOUT_CODE" =~ ^2 ]] && check "POST /auth/logout ($LOGOUT_CODE)" "ok" || check "POST /auth/logout" "$LOGOUT_CODE"
ME_AFTER=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK" "$API/auth/me")
[[ "$ME_AFTER" =~ ^4 ]] && check "after logout /auth/me blocked ($ME_AFTER)" "ok" || check "logout did not invalidate" "got $ME_AFTER"

hr; log "[11] FE pages — HTTP status"
for r in "/" "/products" "/products/$SLUG" "/posts" "/posts/$PSLUG" "/categories/$CSLUG" \
         "/about" "/contact" "/search" "/login" "/register" "/callback" \
         "/sitemap.xml" "/robots.txt" "/manifest.webmanifest" \
         "/admin/login"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$WEB$r")
  [[ "$code" == "200" ]] && { PASS=$((PASS+1)); log "  PASS  $code $r"; } \
                         || { FAIL=$((FAIL+1)); FAILS+=("FE $r => $code"); log "  FAIL  $code $r"; }
done

hr; log "[12] FE protected routes redirect (307) when unauthenticated"
for r in "/admin" "/admin/dashboard" "/admin/builder" "/admin/settings" "/account" "/account/profile"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$WEB$r")
  if [[ "$code" == "307" || "$code" == "302" || "$code" == "308" ]]; then
    PASS=$((PASS+1)); log "  PASS  $code $r (redirect)"
  else
    FAIL=$((FAIL+1)); FAILS+=("FE $r expected redirect, got $code"); log "  FAIL  $code $r"
  fi
done

hr; log "[13] SEO assets"
for r in "/" "/products/$SLUG" "/posts/$PSLUG"; do
  n=$(curl -s "$WEB$r" | grep -oE 'application/ld\+json' | wc -l)
  [[ "$n" -ge 2 ]] && { PASS=$((PASS+1)); log "  PASS  $n JSON-LD on $r"; } \
                  || { FAIL=$((FAIL+1)); FAILS+=("JSON-LD missing on $r"); log "  FAIL  $n JSON-LD on $r"; }
done
SITEMAP=$(curl -s "$WEB/sitemap.xml")
N=$(echo "$SITEMAP" | grep -oE '<loc>[^<]+</loc>' | wc -l)
[[ "$N" -ge 5 ]] && check "sitemap has $N URLs" "ok" || check "sitemap" "only $N urls"
echo "$SITEMAP" | grep -q "$WEB/products/$SLUG" && check "sitemap contains product URL" "ok" || check "sitemap product url" "missing"
echo "$SITEMAP" | grep -q "$WEB/posts/$PSLUG"   && check "sitemap contains post URL" "ok"    || check "sitemap post url" "missing"

ROBOTS=$(curl -s "$WEB/robots.txt")
echo "$ROBOTS" | grep -q "Disallow: /admin" && check "robots disallows /admin" "ok" || check "robots /admin" "missing"
echo "$ROBOTS" | grep -q "Sitemap:"          && check "robots references sitemap" "ok" || check "robots sitemap" "missing"

hr; log "[14] Open Graph & meta tags on product detail"
HTML=$(curl -s "$WEB/products/$SLUG")
echo "$HTML" | grep -q 'og:title'        && check "og:title present" "ok"        || check "og:title" "missing"
echo "$HTML" | grep -q 'og:description'  && check "og:description present" "ok"  || check "og:description" "missing"
echo "$HTML" | grep -q 'name="description"' && check "<meta description>" "ok"   || check "meta description" "missing"
echo "$HTML" | grep -q '"@type":"Product"' && check "Product JSON-LD" "ok"       || check "Product JSON-LD" "missing"
echo "$HTML" | grep -q 'BreadcrumbList'  && check "BreadcrumbList JSON-LD" "ok"  || check "BreadcrumbList" "missing"

hr; log "[15] Cloudinary signed-upload endpoint reachable"
# admin login again for media test
curl -s -c "$COOK" -X POST "$API/auth/admin/login" -H 'Content-Type: application/json' \
  -d '{"email":"vhdcorp.contact@gmail.com","password":"admin123"}' >/dev/null
SIGN=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK" -X POST "$API/media/sign" -H 'Content-Type: application/json' -d '{"folder":"products"}')
[[ "$SIGN" =~ ^[24] ]] && check "POST /media/sign reachable ($SIGN)" "ok" || check "/media/sign" "got $SIGN"

hr; log "===================================================================="
log "TOTAL: $((PASS+FAIL))  PASS: $PASS  FAIL: $FAIL"
log "===================================================================="
if [[ $FAIL -gt 0 ]]; then
  log ""; log "Failures:"
  for f in "${FAILS[@]}"; do log "  - $f"; done
fi
log ""
log "Finished at $(stamp)"
rm -f "$COOK"
exit $FAIL
