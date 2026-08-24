#!/usr/bin/env bash
#
# Cài trợ lý nội bộ VHD Corp lên máy chủ. Chạy MỘT lần bằng sudo, sau đó mọi việc
# bật/tắt/xem đều làm ở trang quản trị.
#
#   sudo bash install.sh assistant.vhdcorp.com
#
# Chạy lại được nhiều lần: bước nào đã xong thì bỏ qua, không phá cấu hình cũ.
set -euo pipefail

DOMAIN="${1:-}"
REPO_URL="${REPO_URL:-git@github.com:QuyDatSadBoy/vhdcorp.git}"
# Nhánh chứa mã trợ lý. Mặc định develop vì assistant/ nằm ở đó; clone nhánh
# mặc định (main) sẽ ra một repo KHÔNG có thư mục assistant.
BRANCH="${BRANCH:-develop}"
ROOT=/opt/vhd-assistant
APP="$ROOT/repo/assistant"
USER_NAME=vhdagent
GATE_PORT="${GATE_PORT:-4400}"
BE_URL="${BE_URL:-http://127.0.0.1:8080}"
MAX_ACTIVE="${MAX_ACTIVE:-4}"
IDLE_MINUTES="${IDLE_MINUTES:-20}"

die() { echo "✗ $*" >&2; exit 1; }
ok()  { echo "✓ $*"; }
step(){ echo; echo "── $* ──"; }

[ "$(id -u)" = 0 ] || die "Phải chạy bằng sudo: sudo bash install.sh <tên-miền>"
[ -n "$DOMAIN" ] || die "Thiếu tên miền. Ví dụ: sudo bash install.sh assistant.vhdcorp.com"

step "1/8 Kiểm tra máy chủ"
command -v node >/dev/null || die "Chưa có node"
# systemd chạy service với PATH tối giản. node cài bằng nvm sẽ KHÔNG có trong đó,
# service sẽ chết ngay với "node: command not found" — bắt lỗi ngay từ đây.
NODE_BIN=$(command -v node)
case "$NODE_BIN" in
  /usr/bin/node|/usr/local/bin/node|/bin/node) : ;;
  *) die "node đang ở $NODE_BIN — systemd không thấy được. Cài node hệ thống: apt install nodejs" ;;
esac
command -v corepack >/dev/null || die "Chưa có corepack (đi kèm node)"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || die "Cần node >= 22, đang có $(node -v)"
command -v nginx >/dev/null || die "Chưa có nginx"
command -v git >/dev/null || die "Chưa có git"
FREE_MB=$(free -m | awk 'NR==2{print $7}')
[ "$FREE_MB" -ge 900 ] || echo "⚠ RAM trống chỉ ${FREE_MB}MB — nên giảm MAX_ACTIVE"
ok "node $(node -v) tại $NODE_BIN, nginx, git, RAM trống ${FREE_MB}MB"

step "2/8 Người dùng hệ thống riêng ($USER_NAME)"
if id "$USER_NAME" >/dev/null 2>&1; then
  ok "đã có"
else
  adduser --system --group --home "$ROOT" "$USER_NAME"
  ok "đã tạo (không đăng nhập được, không có sudo)"
fi
mkdir -p "$ROOT/homes"
chown -R "$USER_NAME:$USER_NAME" "$ROOT"
chmod 700 "$ROOT/homes"

step "3/8 Lấy mã và build"
# Clone/pull bằng ROOT: khoá SSH của repo riêng tư nằm ở root, còn vhdagent là tài
# khoản hệ thống không có khoá. Xong thì chuyển chủ cho vhdagent.
# -c safe.directory: repo thuộc vhdagent nhưng git chạy bằng root, git 2.35+ từ
# chối làm việc với repo của người khác nếu không khai báo ngoại lệ.
GIT="git -c safe.directory=$ROOT/repo"
if [ -d "$ROOT/repo/.git" ]; then
  $GIT -C "$ROOT/repo" fetch -q --depth 1 origin "$BRANCH"
  $GIT -C "$ROOT/repo" checkout -q -B "$BRANCH" FETCH_HEAD
  ok "đã cập nhật mã ($BRANCH)"
else
  git clone -q --depth 1 --branch "$BRANCH" "$REPO_URL" "$ROOT/repo"
  ok "đã tải mã ($BRANCH)"
fi
[ -d "$APP" ] || die "Nhánh $BRANCH không có thư mục assistant/ — kiểm tra lại BRANCH"
chown -R "$USER_NAME:$USER_NAME" "$ROOT/repo"

# corepack enable ghi shim vào /usr/bin nên phải chạy bằng root, không phải vhdagent.
corepack enable pnpm >/dev/null 2>&1 || die "Không bật được pnpm qua corepack"
ok "pnpm đã bật qua corepack"

cd "$APP"
# Bỏ qua cài + build khi mã KHÔNG đổi: build mất ~5 phút, mà installer được thiết
# kế để chạy lại nhiều lần (sửa nginx, đổi trần người dùng...). Mốc so sánh là
# commit đang checkout.
HEAD_SHA=$($GIT -C "$ROOT/repo" rev-parse HEAD)
STAMP="$ROOT/.built-sha"
if [ -f "$APP/apps/cli/lib/bin.js" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$HEAD_SHA" ]; then
  ok "mã không đổi → bỏ qua cài lại và build (tiết kiệm ~5 phút)"
else
  # -H để HOME trỏ về $ROOT: thiếu nó thì HOME vẫn là /root, corepack ghi cache
  # vào /root/.cache và bị từ chối quyền.
  sudo -u "$USER_NAME" -H pnpm install --frozen-lockfile
  sudo -u "$USER_NAME" -H pnpm build
  echo "$HEAD_SHA" > "$STAMP"
  chown "$USER_NAME:$USER_NAME" "$STAMP"
fi
[ -f "$APP/apps/cli/lib/bin.js" ] || die "Build xong mà thiếu apps/cli/lib/bin.js"
ok "đã build"

# Dọn hai gói binary chỉ dùng cho subagent Codex / Claude Code. VHD chạy DeepSeek
# nên không cần, mà chúng chiếm ~560MB. Đã kiểm: xoá xong trợ lý vẫn bật lên và
# trả trang bình thường. Đặt PRUNE_SUBAGENTS=0 nếu muốn giữ.
if [ "${PRUNE_SUBAGENTS:-1}" = 1 ]; then
  FREE_BEFORE=$(df --output=avail -BM / | tail -1 | tr -dc '0-9')
  rm -rf "$APP"/node_modules/.pnpm/@openai+codex@*-linux-* \
         "$APP"/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-linux-* 2>/dev/null || true
  sudo -u "$USER_NAME" -H pnpm store prune >/dev/null 2>&1 || true
  FREE_AFTER=$(df --output=avail -BM / | tail -1 | tr -dc '0-9')
  ok "dọn gói không dùng: giải phóng $((FREE_AFTER - FREE_BEFORE))MB (còn trống ${FREE_AFTER}MB)"
  echo "   (subagent Codex/Claude Code sẽ không chạy được — VHD dùng DeepSeek nên không cần)"
fi

step "4/8 Cấu hình"
ENV_FILE="$ROOT/.env"
# Token để trang quản trị đọc được ai đang dùng. Giữ nguyên nếu đã có, vì backend
# cũng đang dùng đúng token này.
if [ -f "$ENV_FILE" ] && grep -q '^VHD_ADMIN_TOKEN=' "$ENV_FILE"; then
  TOKEN=$(grep '^VHD_ADMIN_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
  ok "giữ token cũ"
else
  TOKEN=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 40)
  ok "đã sinh token mới"
fi
# Giữ lại khoá API mô hình nếu đã có
KEEP_KEYS=$( [ -f "$ENV_FILE" ] && grep -E '^(DEEPSEEK_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)=' "$ENV_FILE" || true )
cat > "$ENV_FILE" <<EOF
$KEEP_KEYS
VHD_GATE_PORT=$GATE_PORT
VHD_BE_URL=$BE_URL
VHD_HOMES=$ROOT/homes
VHD_MAX_ACTIVE=$MAX_ACTIVE
VHD_IDLE_MINUTES=$IDLE_MINUTES
VHD_DSH_COMMAND=node apps/cli/lib/bin.js web
VHD_DSH_CWD=$APP
VHD_ADMIN_TOKEN=$TOKEN
EOF
chown "$USER_NAME:$USER_NAME" "$ENV_FILE"
chmod 600 "$ENV_FILE"
ok "$ENV_FILE (quyền 600)"

step "5/8 Dịch vụ systemd (có giới hạn RAM/CPU cứng)"
cat > /etc/systemd/system/vhd-gate.service <<EOF
[Unit]
Description=Cong vao tro ly noi bo VHD Corp
After=network.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$APP/gate
EnvironmentFile=$ENV_FILE
ExecStart=$NODE_BIN gate.mjs

# Hàng rào tài nguyên tính CẢ tiến trình trợ lý con: vượt là nhân hệ thống dừng,
# web ban hang KHONG bi anh huong.
MemoryMax=1400M
MemoryHigh=1100M
TasksMax=512
CPUQuota=200%

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$ROOT
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RemoveIPC=true

Restart=on-failure
RestartSec=5
KillMode=control-group

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable vhd-gate >/dev/null
systemctl restart vhd-gate
sleep 3
systemctl is-active --quiet vhd-gate || {
  journalctl -u vhd-gate -n 25 --no-pager
  die "Dịch vụ không lên — xem log ở trên"
}
ok "vhd-gate đang chạy"

step "6/8 nginx + HTTPS cho $DOMAIN"
SITE=/etc/nginx/sites-available/vhd-assistant

# TLS: chọn theo hạ tầng đang có, KHÔNG mặc định certbot.
# Máy chủ này đứng sau Cloudflare với chứng chỉ origin sẵn — xin thêm Let's Encrypt
# là vô ích vì khách chỉ nói chuyện với Cloudflare, không nói chuyện với origin.
ORIGIN_CRT=/etc/nginx/ssl/origin.crt
ORIGIN_KEY=/etc/nginx/ssl/origin.key
if [ -f "$ORIGIN_CRT" ] && [ -f "$ORIGIN_KEY" ]; then
  CRT="$ORIGIN_CRT"; KEY="$ORIGIN_KEY"; TLS_KIND="chứng chỉ origin (Cloudflare)"
elif [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  CRT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"; TLS_KIND="Let's Encrypt đã có"
else
  command -v certbot >/dev/null || die "Không có chứng chỉ origin lẫn certbot. Cài certbot hoặc đặt cert vào $ORIGIN_CRT"
  cat > "$SITE" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / { proxy_pass http://127.0.0.1:$GATE_PORT; }
}
EOF
  ln -sf "$SITE" /etc/nginx/sites-enabled/vhd-assistant
  nginx -t && systemctl reload nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    -m "${CERTBOT_EMAIL:-vhdcorp.contact@gmail.com}" --redirect \
    || die "certbot thất bại — kiểm tra DNS của $DOMAIN đã trỏ TRỰC TIẾP về máy chủ chưa (tắt proxy Cloudflare)"
  CRT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"; TLS_KIND="Let's Encrypt vừa xin"
fi
ok "TLS: $TLS_KIND"

# IP thật của khách khi đứng sau Cloudflare. Không có phần này thì mọi người mang
# CÙNG một IP của Cloudflare — một người nhập sai mật khẩu 5 lần là KHOÁ CẢ CÔNG TY.
CF_SNIPPET=/etc/nginx/snippets/vhd-cloudflare-realip.conf
mkdir -p /etc/nginx/snippets
if curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4 -o /tmp/cf4 \
   && curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6 -o /tmp/cf6; then
  {
    echo "# Sinh tự động bởi install.sh — dải IP của Cloudflare"
    sed 's/^/set_real_ip_from /; s/$/;/' /tmp/cf4
    sed 's/^/set_real_ip_from /; s/$/;/' /tmp/cf6
    echo "real_ip_header CF-Connecting-IP;"
    echo "real_ip_recursive on;"
  } > "$CF_SNIPPET"
  CF_INCLUDE="include $CF_SNIPPET;"
  ok "đã lấy $(grep -c set_real_ip_from "$CF_SNIPPET") dải IP Cloudflare"
else
  CF_INCLUDE="# không lấy được dải IP Cloudflare — chống dò mật khẩu sẽ tính theo IP của Cloudflare"
  echo "   ⚠ Không tải được dải IP Cloudflare. Chống dò mật khẩu vẫn chạy nhưng tính chung theo IP Cloudflare."
fi

cat > "$SITE" <<EOF
# Trợ lý nội bộ VHD — sinh bởi deploy-vhd/install.sh
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    # Dạng này chạy trên mọi phiên bản nginx. `http2 on;` chỉ có từ 1.25.1 —
    # máy chủ đang dùng 1.24 và sẽ báo "unknown directive".
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     $CRT;
    ssl_certificate_key $KEY;

    $CF_INCLUDE

    # Không cho công cụ tìm kiếm ghi nhận trang nội bộ
    add_header X-Robots-Tag "noindex, nofollow" always;
    # Tệp anh em gửi lên cho trợ lý đọc
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$GATE_PORT;
        proxy_http_version 1.1;

        # Trợ lý đẩy tiến trình về bằng WebSocket — thiếu hai dòng này là mất kết nối
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host              \$host;
        # \$remote_addr đã là IP THẬT nhờ khối real_ip ở trên
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Trợ lý làm việc dài (đọc mã, chạy lệnh) — timeout ngắn cắt giữa việc.
        # Lần đầu một người vào còn phải chờ tiến trình riêng của họ bật lên.
        proxy_read_timeout  3600s;
        proxy_send_timeout  3600s;
        proxy_connect_timeout 120s;
        proxy_buffering     off;   # tiến trình hiện dần, không dồn một cục
    }
}
EOF
ln -sf "$SITE" /etc/nginx/sites-enabled/vhd-assistant
# nginx -t hỏng thì BỎ symlink ra: để lại là lần reload sau của người khác cũng chết
if ! nginx -t 2>/tmp/nginx-test.log; then
  rm -f /etc/nginx/sites-enabled/vhd-assistant
  cat /tmp/nginx-test.log
  die "Cấu hình nginx không hợp lệ — đã bỏ site ra, nginx đang chạy không bị ảnh hưởng"
fi
systemctl reload nginx
ok "nginx đã nạp site $DOMAIN"

step "7/8 Nối trang quản trị với trợ lý"
# Trang quản trị cần token này để đọc được ai đang dùng. Tự ghi vào .env của
# backend để admin không phải copy tay.
BE_ENV=""
for cand in /root/vhdcorp/be/.env /home/*/vhdcorp/be/.env /opt/vhdcorp/be/.env; do
  [ -f "$cand" ] && { BE_ENV="$cand"; break; }
done
if [ -n "$BE_ENV" ]; then
  if grep -q '^VHD_ADMIN_TOKEN=' "$BE_ENV"; then
    sed -i "s|^VHD_ADMIN_TOKEN=.*|VHD_ADMIN_TOKEN=$TOKEN|" "$BE_ENV"
  else
    printf '\nVHD_ADMIN_TOKEN=%s\n' "$TOKEN" >> "$BE_ENV"
  fi
  grep -q '^VHD_GATE_URL=' "$BE_ENV" \
    || printf 'VHD_GATE_URL=http://127.0.0.1:%s\n' "$GATE_PORT" >> "$BE_ENV"
  ok "đã ghi token vào $BE_ENV"
  if command -v pm2 >/dev/null && pm2 describe vhd-be >/dev/null 2>&1; then
    pm2 restart vhd-be >/dev/null 2>&1 && ok "đã khởi động lại backend"
  else
    echo "   ⚠ Không thấy pm2 vhd-be — hãy khởi động lại backend để nạp token"
  fi
else
  echo "   ⚠ Không tìm thấy .env của backend. Thêm tay 2 dòng này rồi restart BE:"
  echo "       VHD_ADMIN_TOKEN=$TOKEN"
  echo "       VHD_GATE_URL=http://127.0.0.1:$GATE_PORT"
fi

step "8/8 Dọn rác tự động hằng ngày"
cat > /etc/systemd/system/vhd-assistant-gc.service <<EOF
[Unit]
Description=Don rac tro ly noi bo VHD

[Service]
Type=oneshot
User=$USER_NAME
# Chỉ dọn log/cache/tmp cũ hơn 14 ngày. KHÔNG xoá file trong workspace của anh em.
ExecStart=/usr/bin/find $ROOT/homes -mindepth 2 -maxdepth 4 -type d \\
  \\( -name logs -o -name cache -o -name tmp \\) -exec find {} -type f -mtime +14 -delete ;
EOF
cat > /etc/systemd/system/vhd-assistant-gc.timer <<EOF
[Unit]
Description=Don rac tro ly noi bo VHD hang ngay

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now vhd-assistant-gc.timer >/dev/null
ok "đã bật hẹn giờ dọn rác"

echo
DISK=$(df -h / | tail -1 | awk '{print $4" trống / "$2}')
RAMNOW=$(free -m | awk 'NR==2{print $7"MB trống / "$2"MB"}')
echo "════════════════════════════════════════════════════════"
echo " XONG. Vào https://$DOMAIN để đăng nhập."
echo " Đĩa: $DISK · RAM: $RAMNOW"
echo " Dùng chính tài khoản quản trị vhdcorp.com."
echo
echo " Từ giờ KHÔNG cần nhớ lệnh nào: bật/tắt, xem ai đang"
echo " dùng, xem RAM — tất cả ở trang /admin/server."
echo "════════════════════════════════════════════════════════"
