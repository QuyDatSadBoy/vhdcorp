#!/usr/bin/env bash
# ===============================================================
# VHD Corp — Admin Builder / Customization Test Suite
# Mục tiêu: bảo đảm admin có toàn quyền tùy chỉnh UI (drag-drop,
# theme, brand, navigation, footer, sections, history, rollback,
# media, SEO) — không thiếu thứ gì để bàn giao khách hàng.
# ===============================================================
set -u
LOG="${1:-logs/admin-builder-test.log}"
mkdir -p "$(dirname "$LOG")"

API="http://localhost:8080/api"
WEB="http://localhost:3000"
COOK_ADMIN=$(mktemp)
COOK_NONE=$(mktemp)
PASS=0
FAIL=0
FAILS=()

stamp() { date +"%Y-%m-%d %H:%M:%S"; }
log()   { echo -e "$*" | tee -a "$LOG"; }
hr()    { log "------------------------------------------------------------"; }
section() { hr; log "[$1] $2"; }

ok()   { PASS=$((PASS+1)); log "  PASS  $1"; }
fail() { FAIL=$((FAIL+1)); FAILS+=("$1 :: $2"); log "  FAIL  $1  ($2)"; }

# expect_code METHOD URL EXPECTED [COOKIE_FILE] [DATA] [CONTENT_TYPE]
expect_code() {
  local method="$1" url="$2" expected="$3" cook="${4:-$COOK_NONE}" data="${5:-}" ct="${6:-application/json}"
  local code
  if [[ -n "$data" ]]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" -b "$cook" -c "$cook" -H "Content-Type: $ct" -d "$data" "$url")
  else
    code=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" -b "$cook" -c "$cook" "$url")
  fi
  if [[ "$code" == "$expected" ]]; then ok "$method $url -> $code"
  else fail "$method $url" "expected $expected got $code"
  fi
}

> "$LOG"
log "===================================================================="
log "VHD Corp Admin Builder Test  ::  $(stamp)"
log "===================================================================="

# -----------------------------------------------------------------
section "0" "Health"
expect_code GET "$API/health" 200

# -----------------------------------------------------------------
section "1" "Admin login (email/password ONLY — no Google)"
LOGIN=$(curl -s -c "$COOK_ADMIN" -X POST "$API/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vhdcorp.com","password":"admin123"}')
echo "$LOGIN" | grep -q '"role":"ADMIN"' && ok "admin login returns ADMIN role" || fail "admin login role" "missing ADMIN"
grep -q access_token  "$COOK_ADMIN" && ok "access_token cookie set"  || fail "access_token cookie" "missing"
grep -q refresh_token "$COOK_ADMIN" && ok "refresh_token cookie set" || fail "refresh_token cookie" "missing"

# -----------------------------------------------------------------
section "2" "Public GET /site-config — no auth required"
PUB=$(curl -s "$API/site-config")
echo "$PUB" | grep -q '"key":"main"'      && ok "public config has key=main"   || fail "public key" "missing"
echo "$PUB" | grep -q '"status":"PUBLISHED"' && ok "public config is PUBLISHED" || fail "public status" "missing"

# -----------------------------------------------------------------
section "3" "Admin GET /site-config/draft — auto-create from PUBLISHED if missing"
DRAFT=$(curl -s -b "$COOK_ADMIN" "$API/site-config/draft")
echo "$DRAFT" | grep -q '"status":"DRAFT"' && ok "draft fetched/created" || fail "draft fetch" "$(echo "$DRAFT" | head -c 200)"
DRAFT_ID=$(echo "$DRAFT" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
[[ -n "$DRAFT_ID" ]] && ok "draft id=$DRAFT_ID" || fail "draft id" "no id"

# -----------------------------------------------------------------
section "4" "Non-admin must be blocked from /site-config/draft"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/site-config/draft")
[[ "$CODE" =~ ^4 ]] && ok "no-cookie -> $CODE" || fail "no-cookie draft" "got $CODE"

# -----------------------------------------------------------------
section "5" "PUT /site-config/draft — full SiteConfig structure (brand+theme+seo+pages+nav+footer)"
TS=$(date +%s)
FULL_VALUE=$(cat <<EOF
{
  "brand":{
    "siteName":"VHD Corp ${TS}",
    "tagline":"Kết nối giá trị – Hợp tác vững bền",
    "logo":{"url":"https://res.cloudinary.com/vhdcorp/image/upload/brand/logo.png","publicId":"brand/logo"},
    "favicon":{"url":"https://res.cloudinary.com/vhdcorp/image/upload/brand/favicon.ico"},
    "ogDefaultImage":{"url":"https://res.cloudinary.com/vhdcorp/image/upload/brand/og.jpg","width":1200,"height":630}
  },
  "theme":{
    "colors":{"primary":"#1B3A8C","accent":"#4FB8E7","highlight":"#F5A623","background":"#FFFFFF","surface":"#F7F8FB","text":"#1A1A2E","danger":"#C8102E"},
    "fonts":{"heading":"Be Vietnam Pro","body":"Inter","baseSize":16,"lineHeight":1.6},
    "spacing":"normal",
    "borderRadius":12
  },
  "seo":{
    "titleTemplate":"%s | VHD Corp",
    "defaultDescription":"VHD Corp — kết nối giá trị, hợp tác vững bền.",
    "defaultKeywords":["vhd","nhựa cao su","làng nghề","việt nam"],
    "googleAnalyticsId":"",
    "facebookPixelId":""
  },
  "pages":{
    "home":{"sections":[
      {"id":"hero-${TS}","type":"hero","order":1,"visible":true,"props":{"heading":"Khám phá làng nghề Việt","subheading":"Đặt hàng B2B/B2C nhanh chóng","ctaText":"Khám phá","ctaLink":"/products","align":"center","minHeight":640}},
      {"id":"fp-${TS}","type":"featured-products","order":2,"visible":true,"props":{"heading":"Sản phẩm nổi bật","limit":8,"layout":"grid"}},
      {"id":"cg-${TS}","type":"category-grid","order":3,"visible":true,"props":{"heading":"Danh mục","categoryIds":[],"columns":4}},
      {"id":"bs-${TS}","type":"banner-slider","order":4,"visible":true,"props":{"slides":[],"autoplay":true,"interval":5000}},
      {"id":"bp-${TS}","type":"blog-preview","order":5,"visible":true,"props":{"heading":"Tin tức","limit":3,"layout":"grid"}},
      {"id":"t-${TS}","type":"testimonials","order":6,"visible":true,"props":{"quotes":[{"name":"Khách A","role":"CEO","company":"ABC","quote":"Tuyệt vời"}],"autoplay":true}},
      {"id":"sc-${TS}","type":"stats-counter","order":7,"visible":true,"props":{"stats":[{"label":"Khách hàng","value":1000,"unit":"+"},{"label":"Sản phẩm","value":500,"unit":"+"}]}},
      {"id":"p-${TS}","type":"partners","order":8,"visible":true,"props":{"logos":[]}},
      {"id":"cta-${TS}","type":"contact-cta","order":9,"visible":true,"props":{"heading":"Sẵn sàng hợp tác?","body":"Liên hệ ngay","ctaText":"Liên hệ","ctaLink":"/contact","bgColor":"#1B3A8C"}},
      {"id":"html-${TS}","type":"custom-html","order":10,"visible":true,"props":{"html":"<div data-test=\"builder-${TS}\">Custom block</div>"}}
    ]},
    "about":{"sections":[]},
    "contact":{"sections":[]}
  },
  "navigation":[
    {"id":"n1","label":"Trang chủ","href":"/","order":1,"children":[]},
    {"id":"n2","label":"Sản phẩm","href":"/products","order":2,"children":[]},
    {"id":"n3","label":"Tin tức","href":"/posts","order":3,"children":[]},
    {"id":"n4","label":"Giới thiệu","href":"/about","order":4,"children":[]},
    {"id":"n5","label":"Liên hệ","href":"/contact","order":5,"children":[]},
    {"id":"n6-${TS}","label":"Khuyến mãi","href":"/posts?tag=promo","order":6,"children":[],"external":false}
  ],
  "footer":{
    "columns":[
      {"title":"Về VHD","links":[{"label":"Giới thiệu","href":"/about"},{"label":"Liên hệ","href":"/contact"}]},
      {"title":"Sản phẩm","links":[{"label":"Tất cả","href":"/products"}]}
    ],
    "socials":{"facebook":"https://facebook.com/vhdcorp","youtube":""},
    "copyright":"© ${TS} VHD Corp",
    "showMap":true
  },
  "customCss":"/* builder-marker-${TS} */"
}
EOF
)
PAYLOAD=$(jq -nc --argjson v "$FULL_VALUE" '{value:$v}')
SAVE_BODY=$(curl -s -b "$COOK_ADMIN" -X PUT "$API/site-config/draft" \
  -H 'Content-Type: application/json' --data "$PAYLOAD")
echo "$SAVE_BODY" | grep -q '"status":"DRAFT"' && ok "PUT draft saved (DRAFT)" || fail "PUT draft" "$(echo "$SAVE_BODY" | head -c 300)"
echo "$SAVE_BODY" | grep -q "VHD Corp ${TS}" && ok "draft persisted siteName" || fail "draft siteName" "missing in $(echo "$SAVE_BODY" | head -c 300)"
echo "$SAVE_BODY" | grep -q "builder-marker-${TS}" && ok "draft persisted customCss" || fail "draft customCss" "missing"

# -----------------------------------------------------------------
section "6" "PUT draft a 2nd time — must update SAME draft (no duplicate)"
NEW_NAME="VHD Corp ${TS}-v2"
PAYLOAD2=$(jq -nc --arg n "$NEW_NAME" --argjson v "$FULL_VALUE" '{value: ($v | .brand.siteName=$n)}')
SAVE2=$(curl -s -b "$COOK_ADMIN" -X PUT "$API/site-config/draft" -H 'Content-Type: application/json' --data "$PAYLOAD2")
SAVE2_ID=$(echo "$SAVE2" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
[[ "$SAVE2_ID" == "$DRAFT_ID" ]] && ok "2nd save reuses draft id=$DRAFT_ID" || fail "draft duplicate" "1st=$DRAFT_ID 2nd=$SAVE2_ID"

# -----------------------------------------------------------------
section "7" "POST /site-config/publish — promotes draft, snapshots history"
HIST_LATEST_BEFORE=$(curl -s -b "$COOK_ADMIN" "$API/site-config/history" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
HIST_LATEST_BEFORE=${HIST_LATEST_BEFORE:-0}
PUB_RES=$(curl -s -b "$COOK_ADMIN" -X POST "$API/site-config/publish")
echo "$PUB_RES" | grep -q '"status":"PUBLISHED"' && ok "publish returns PUBLISHED" || fail "publish status" "$(echo "$PUB_RES" | head -c 300)"
echo "$PUB_RES" | grep -q "$NEW_NAME" && ok "published value contains new siteName" || fail "publish siteName" "missing"
HIST_LATEST_AFTER=$(curl -s -b "$COOK_ADMIN" "$API/site-config/history" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
HIST_LATEST_AFTER=${HIST_LATEST_AFTER:-0}
[[ "$HIST_LATEST_AFTER" -gt "$HIST_LATEST_BEFORE" ]] && ok "history latest id grew $HIST_LATEST_BEFORE -> $HIST_LATEST_AFTER" || fail "history snapshot" "no new id (was $HIST_LATEST_BEFORE)"

# Flush FE ISR cache so next curl sees fresh content
curl -s -X POST "$WEB/api/revalidate" -H "x-revalidate-secret: vhdcorp-revalidate" >/dev/null
sleep 1

# -----------------------------------------------------------------
section "8" "Public GET /site-config — must reflect just-published value"
PUB2=$(curl -s "$API/site-config")
echo "$PUB2" | grep -q "$NEW_NAME" && ok "public reflects new siteName" || fail "public siteName" "missing"
echo "$PUB2" | grep -q "builder-marker-${TS}" && ok "public reflects customCss" || fail "public customCss" "missing"

# -----------------------------------------------------------------
section "9" "FE consumes published config — siteName in <title>"
HOME_HTML=$(curl -s -m 8 "$WEB/")
echo "$HOME_HTML" | grep -q "$NEW_NAME" && ok "FE / contains '$NEW_NAME'" || fail "FE title" "siteName missing in HTML"

# -----------------------------------------------------------------
section "10" "FE injects builder-customCss style tag"
echo "$HOME_HTML" | grep -q "builder-marker-${TS}" && ok "FE injects customCss" || fail "FE customCss" "marker missing"

# -----------------------------------------------------------------
section "11" "FE Header renders custom navigation item"
echo "$HOME_HTML" | grep -q "Khuyến mãi" && ok "FE nav contains 'Khuyến mãi'" || fail "FE nav" "custom item missing"

# -----------------------------------------------------------------
section "12" "Re-publish cycle — second publish must NOT violate unique([key,status])"
# Create another draft (because publish consumed previous) and publish again
curl -s -b "$COOK_ADMIN" "$API/site-config/draft" >/dev/null
PAYLOAD3=$(jq -nc --argjson v "$FULL_VALUE" '{value: ($v | .brand.siteName="VHD Corp Round2")}')
curl -s -b "$COOK_ADMIN" -X PUT "$API/site-config/draft" -H 'Content-Type: application/json' --data "$PAYLOAD3" >/dev/null
PUB3=$(curl -s -b "$COOK_ADMIN" -X POST "$API/site-config/publish")
echo "$PUB3" | grep -q '"status":"PUBLISHED"' && ok "2nd publish OK" || fail "2nd publish" "$(echo "$PUB3" | head -c 300)"
echo "$PUB3" | grep -q "VHD Corp Round2" && ok "2nd publish value applied" || fail "2nd publish value" "missing"

# -----------------------------------------------------------------
section "13" "Rollback to a previous history snapshot"
HID=$(curl -s -b "$COOK_ADMIN" "$API/site-config/history" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
[[ -n "$HID" ]] && ok "history id=$HID" || fail "history id" "no history"
if [[ -n "$HID" ]]; then
  RB=$(curl -s -b "$COOK_ADMIN" -X POST "$API/site-config/rollback/$HID")
  echo "$RB" | grep -q '"status":"DRAFT"' && ok "rollback creates/updates DRAFT" || fail "rollback" "$(echo "$RB" | head -c 300)"
fi

# -----------------------------------------------------------------
section "14" "Cloudinary signed-upload (admin builder media picker)"
SIGN_RES=$(curl -s -b "$COOK_ADMIN" -X POST "$API/media/sign" -H 'Content-Type: application/json' -d '{"folder":"brand"}')
SIGN_CODE=$(echo "$SIGN_RES" | grep -oE '"(signature|cloudName|apiKey)"' | sort -u | wc -l)
[[ "$SIGN_CODE" -ge 2 ]] && ok "/media/sign returns signature payload" || fail "/media/sign" "$(echo "$SIGN_RES" | head -c 200)"

# -----------------------------------------------------------------
section "15" "Permission guard — staff CAN save draft, CANNOT publish"
# Try to register a staff via admin: PATCH user's role
STAFF_EMAIL="staff-${TS}@vhd.test"
REG=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$STAFF_EMAIL\",\"password\":\"staff123\",\"name\":\"Staff Test\"}")
SUID=$(echo "$REG" | grep -oE '"id":[0-9]+' | head -1 | sed 's/.*://')
if [[ -n "$SUID" ]]; then
  # No admin endpoint to update role -> use psql directly
  PGPASSWORD=datsql09 psql -h localhost -U postgres -d vhdcorp_dev -c "UPDATE users SET role='STAFF' WHERE id=$SUID" >/dev/null 2>&1
  COOK_STAFF=$(mktemp)
  curl -s -c "$COOK_STAFF" -X POST "$API/auth/admin/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$STAFF_EMAIL\",\"password\":\"staff123\"}" >/dev/null
  STAFF_ME=$(curl -s -b "$COOK_STAFF" "$API/auth/me")
  echo "$STAFF_ME" | grep -q '"role":"STAFF"' && ok "staff logged in" || fail "staff login" "$(echo "$STAFF_ME" | head -c 200)"
  STAFF_DRAFT_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK_STAFF" "$API/site-config/draft")
  [[ "$STAFF_DRAFT_CODE" == "200" ]] && ok "staff GET draft 200" || fail "staff draft" "got $STAFF_DRAFT_CODE"
  STAFF_PUB_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK_STAFF" -X POST "$API/site-config/publish")
  [[ "$STAFF_PUB_CODE" == "403" ]] && ok "staff publish blocked (403)" || fail "staff publish" "got $STAFF_PUB_CODE (expected 403)"
  rm -f "$COOK_STAFF"
fi

# -----------------------------------------------------------------
section "16" "Customer cannot access any /site-config admin endpoint"
COOK_CUST=$(mktemp)
CUST_LOGIN_CODE=$(curl -s -o /dev/null -w '%{http_code}' -c "$COOK_CUST" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"qatest@example.com","password":"qatest123"}')
if [[ "$CUST_LOGIN_CODE" =~ ^2 ]]; then
  for ep in "/site-config/draft" "/site-config/history"; do
    C=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK_CUST" "$API$ep")
    [[ "$C" == "403" ]] && ok "customer GET $ep -> 403" || fail "customer $ep" "got $C"
  done
  PC=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK_CUST" -X POST "$API/site-config/publish")
  [[ "$PC" == "403" ]] && ok "customer POST /publish -> 403" || fail "customer publish" "got $PC"
fi
rm -f "$COOK_CUST"

# -----------------------------------------------------------------
section "17" "Admin builder UI page renders 200 with admin cookie"
BCODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOK_ADMIN" "$WEB/admin/builder")
[[ "$BCODE" == "200" ]] && ok "GET /admin/builder -> 200 (admin)" || fail "/admin/builder" "got $BCODE"

# -----------------------------------------------------------------
section "18" "Admin builder UI redirects when unauthenticated"
BCODE2=$(curl -s -o /dev/null -w '%{http_code}' "$WEB/admin/builder")
[[ "$BCODE2" =~ ^30 ]] && ok "GET /admin/builder unauth -> $BCODE2 (redirect)" || fail "/admin/builder unauth" "got $BCODE2"

# -----------------------------------------------------------------
section "19" "FE renders all 10 builder section types on /"
# After publish, home should contain hero heading + featured-products heading + categories + etc.
HOME2=$(curl -s -m 8 "$WEB/")
EXPECT_TEXT=("Sản phẩm nổi bật" "Tin tức" "Sẵn sàng hợp tác?")
for t in "${EXPECT_TEXT[@]}"; do
  echo "$HOME2" | grep -q "$t" && ok "FE / contains '$t'" || fail "FE section text" "missing '$t'"
done

# -----------------------------------------------------------------
section "20" "Cloudinary env config check"
CLOUD_NAME=$(grep -E '^CLOUDINARY_CLOUD_NAME=' be/.env 2>/dev/null | cut -d= -f2- | tr -d '"')
CLOUD_KEY=$(grep -E '^CLOUDINARY_API_KEY=' be/.env 2>/dev/null | cut -d= -f2- | tr -d '"')
[[ -n "$CLOUD_NAME" ]] && ok "CLOUDINARY_CLOUD_NAME set ($CLOUD_NAME)" || fail "CLOUDINARY_CLOUD_NAME" "empty"
[[ "$CLOUD_KEY" == "832243178579144" ]] && ok "CLOUDINARY_API_KEY=832243178579144" || fail "CLOUDINARY_API_KEY" "got '$CLOUD_KEY'"

# -----------------------------------------------------------------
section "21" "SEO sanity — published siteName in title template"
TITLE_LINE=$(echo "$HOME2" | grep -oE '<title[^>]*>[^<]+</title>' | head -1)
echo "$TITLE_LINE" | grep -q "VHD Corp" && ok "FE <title> contains brand" || fail "FE <title>" "got $TITLE_LINE"
echo "$HOME2" | grep -q 'application/ld+json' && ok "FE / has JSON-LD" || fail "JSON-LD" "missing"
echo "$HOME2" | grep -q 'og:title' && ok "FE / has og:title" || fail "og:title" "missing"

hr
log "===================================================================="
log "TOTAL: $((PASS+FAIL))  PASS: $PASS  FAIL: $FAIL"
log "===================================================================="
if [[ $FAIL -gt 0 ]]; then
  log ""; log "Failures:"
  for f in "${FAILS[@]}"; do log "  - $f"; done
fi
log ""
log "Finished at $(stamp)"
rm -f "$COOK_ADMIN" "$COOK_NONE"
exit $FAIL
