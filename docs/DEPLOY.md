# Deploy VHD Corp lên VPS Ubuntu + CI/CD

> **Stack triển khai**: PostgreSQL **cài thẳng trên Ubuntu** (không Docker) · 3 service Node/Python chạy qua **PM2** · **Kong Gateway** làm reverse proxy + TLS + rate-limit trước toàn bộ · GitHub Actions tự deploy khi push `main`.
> VPS tối thiểu: **2 core / 4GB RAM / 35GB NVMe** (đo thực tế: 3 service production + Postgres ~1.2–1.5GB RAM). Bật swap 4GB vì `next build` cần ~2GB đỉnh.

---

## 0. Cho Claude Code agent chạy trên VPS — ĐỌC TRƯỚC

> Khi SSH vào VPS và giao việc cho Claude Code, dán đúng đoạn này để agent hiểu ngữ cảnh:

**Bối cảnh dự án**: monorepo VHD Corp — thương mại điện tử B2B/B2C (nhựa, cao su, đặc sản làng nghề) gồm 3 service:

- `be/` — NestJS 11 + Prisma 7 + PostgreSQL, cổng **8080**, prefix `/api`.
- `fe/` — Next.js 16 (App Router) + Tailwind v4, cổng **3001**.
- `agent/` — FastAPI + LangGraph (Gemini), cổng **8001**; đọc trực tiếp Postgres qua `CATALOG_DATABASE_URL`, có A2A (`/.well-known/agent-card.json`) + MCP (`/mcp`).

**Tài liệu phải đọc theo thứ tự**:

1. `docs/TINH_NANG.md` — tổng quan toàn hệ thống (kiến trúc + mọi tính năng khách/admin/agent). **Đọc đầu tiên.**
2. `docs/DEPLOY.md` (file này) — cách triển khai + vận hành.
3. `docs/HANDOVER.md` — changelog kỹ thuật chi tiết từng đợt (tra khi cần hiểu 1 quyết định cụ thể).
4. `README.md` — chạy local + lệnh dev.
5. `docs/AGENT_PLAN.md` — kiến trúc agent · `docs/DATABASE.md` — schema.

**Quy tắc khi thao tác trên VPS**:

- KHÔNG commit `.env` (đã gitignore). Secrets chỉ nằm trong `.env` trên VPS.
- Deploy = `bash scripts/deploy.sh` (idempotent). Đừng chạy `next dev` trên production — luôn dùng bản build + PM2.
- Migrate production dùng `yarn prisma migrate deploy` (KHÔNG `migrate dev` — tránh tạo migration/đổi schema ngoài ý muốn).
- Trước khi restart/xóa gì, chạy `pm2 status` + `pm2 logs` xem hiện trạng.
- DB thật quan trọng: backup (`pg_dump`) trước mọi thao tác migrate lớn.

---

## 1. Setup VPS lần đầu (1 lần, ~25 phút)

### 1.1 Cơ bản + swap

```bash
sudo apt update && sudo apt -y upgrade
# Swap 4GB — BẮT BUỘC (next build ăn ~2GB đỉnh trên VPS 4GB)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.2 PostgreSQL 16 — cài THẲNG trên Ubuntu (không Docker)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Tạo DB + user riêng cho app (đổi <MẬT_KHẨU_MẠNH>)
sudo -u postgres psql <<'SQL'
CREATE USER vhd WITH PASSWORD '<MẬT_KHẨU_MẠNH>';
CREATE DATABASE vhdcorp_prod OWNER vhd;
\c vhdcorp_prod
CREATE EXTENSION IF NOT EXISTS unaccent;   -- cần cho tìm kiếm tiếng Việt không dấu
GRANT ALL ON SCHEMA public TO vhd;
SQL
```

→ `DATABASE_URL="postgresql://vhd:<MẬT_KHẨU_MẠNH>@localhost:5432/vhdcorp_prod"` (Postgres chỉ nghe localhost mặc định — an toàn, không mở ra ngoài).

### 1.3 Node 22 + yarn + PM2, uv (Python)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22 && npm i -g yarn pm2
curl -LsSf https://astral.sh/uv/install.sh | sh && source ~/.bashrc
```

### 1.4 Clone + điền env

```bash
git clone <URL_REPO> ~/vhdcorp && cd ~/vhdcorp
cp be/.env.example be/.env         # DATABASE_URL (vhdcorp_prod), JWT/COOKIE secrets, SMTP/Gmail,
                                   # Cloudinary, ADMIN_EMAIL, GOOGLE_CLIENT_ID/SECRET,
                                   # GOOGLE_CALLBACK_URL=https://<domain>/api/auth/google/callback,
                                   # FRONTEND_URL + CORS_ORIGIN=https://<domain>, NODE_ENV=production
cp fe/.env.example fe/.env.local   # NEXT_PUBLIC_API_URL=https://<domain>/api
                                   # NEXT_PUBLIC_AGENT_URL=https://<domain>/agent
cp agent/.env.example agent/.env   # GOOGLE_API_KEY, CATALOG_DATABASE_URL=<DATABASE_URL>, Gmail, MiniMax…
```

### 1.5 Deploy lần đầu + seed

```bash
cd ~/vhdcorp
APP_DIR=~/vhdcorp bash scripts/deploy.sh   # cài deps + migrate deploy + build + PM2 + health check
cd be && yarn prisma:seed                  # tạo root admin + dữ liệu mẫu (CHỈ lần đầu)
pm2 startup && pm2 save                     # 3 service tự chạy lại sau reboot VPS
```

> Đổi ngay: mật khẩu root admin (`vhdcorp.contact@gmail.com` / <mật khẩu seed>) + mọi secret dev trong `.env`.

---

## 2. Kong Gateway — reverse proxy + TLS + rate-limit

> Kong đứng trước, route theo path: `/` → FE(3001), `/api` → BE(8080), `/agent` → Agent(8001). Dùng **Kong DB-less** (khai báo bằng file YAML — nhẹ, hợp VPS nhỏ, versioned được).

### 2.1 Cài Kong

```bash
curl -Lo kong.deb "https://packages.konghq.com/public/gateway-3.x/deb/ubuntu/pool/$(lsb_release -cs)/main/k/ko/kong_3.8.0/kong_3.8.0_amd64.deb" || \
  echo "→ nếu link đổi, xem https://docs.konghq.com/gateway/latest/install/linux/ubuntu/"
sudo apt install -y ./kong.deb
```

### 2.2 Cấu hình DB-less (`/etc/kong/kong.conf`)

```
database = off
declarative_config = /etc/kong/kong.yml
proxy_listen = 0.0.0.0:80, 0.0.0.0:443 ssl
```

### 2.3 Khai báo route (`/etc/kong/kong.yml`) — repo có sẵn mẫu `deploy/kong.yml`, copy vào rồi sửa domain

```yaml
_format_version: "3.0"
services:
  - name: vhd-fe
    url: http://localhost:3001
    routes:
      - name: fe
        paths: ["/"]
    plugins:
      - name: rate-limiting
        config: { minute: 300, policy: local }
  - name: vhd-be
    url: http://localhost:8080/api
    routes:
      - name: be
        paths: ["/api"]
        strip_path: true
    plugins:
      - name: rate-limiting
        config: { minute: 600, policy: local }
      - name: cors
        config: { origins: ["https://<domain>"], credentials: true }
  - name: vhd-agent
    url: http://localhost:8001
    routes:
      - name: agent
        paths: ["/agent"]
        strip_path: true
    plugins:
      - name: rate-limiting
        config: { minute: 120, policy: local }
```

```bash
sudo systemctl enable --now kong    # hoặc: kong start -c /etc/kong/kong.conf
```

### 2.4 TLS (Let's Encrypt)

```bash
# Kong đọc chứng chỉ qua certbot (webroot) hoặc dùng plugin acme:
sudo apt install -y certbot
sudo certbot certonly --standalone -d <domain>   # tạm dừng Kong lúc cấp, hoặc dùng plugin acme của Kong
# Trỏ certificate trong kong.yml (mục certificates) hoặc bật plugin `acme` để tự gia hạn.
```

> Đơn giản hơn nếu muốn: dùng **plugin `acme`** của Kong để tự xin + gia hạn Let's Encrypt, khỏi certbot thủ công. Xem https://docs.konghq.com/hub/kong-inc/acme/

### 2.5 Sau khi có domain qua Kong

- `be/.env`: `FRONTEND_URL` + `CORS_ORIGIN` = `https://<domain>`, `GOOGLE_CALLBACK_URL=https://<domain>/api/auth/google/callback` (thêm URI này vào Google Cloud Console).
- `fe/.env.local`: `NEXT_PUBLIC_API_URL=https://<domain>/api`, `NEXT_PUBLIC_AGENT_URL=https://<domain>/agent`.
- Chạy lại `bash scripts/deploy.sh` để build FE với env mới.

---

## 3. CI/CD — push `main` là VPS tự cập nhật

1. Tạo SSH key deploy: `ssh-keygen -t ed25519 -f vhd_deploy` → thêm `vhd_deploy.pub` vào `~/.ssh/authorized_keys` trên VPS.
2. GitHub repo → **Settings → Secrets and variables → Actions**:
   - `VPS_HOST` = IP VPS · `VPS_USER` = user SSH · `VPS_SSH_KEY` = nội dung private key `vhd_deploy` · `VPS_PORT` = 22.
3. Xong — mỗi lần **merge/push vào `main`**, workflow `.github/workflows/deploy.yml` SSH vào VPS chạy `scripts/deploy.sh` (pull → build BE/FE → uv sync → PM2 reload → health check). Build fail thì PM2 giữ bản cũ đang chạy (không sập trang). Theo dõi ở tab Actions; deploy tay: Actions → "Deploy to VPS" → Run workflow.

## 4. Vận hành hằng ngày

```bash
pm2 status                            # 3 service: vhd-be / vhd-fe / vhd-agent
pm2 logs vhd-be --lines 100           # xem log
pm2 restart vhd-agent                 # restart 1 service
sudo -u postgres pg_dump vhdcorp_prod > ~/backup_$(date +%F).sql   # backup DB (đặt cron chạy hằng đêm)
```

## 5. Checklist bảo mật trước khi mở public

- [ ] Đổi mật khẩu root admin + mọi secret trong `.env` (khác giá trị dev).
- [ ] `NODE_ENV=production` (cookie `secure`+`sameSite` bật, lỗi ẩn stacktrace).
- [ ] Postgres chỉ nghe `localhost` (mặc định — đừng mở `listen_addresses='*'`).
- [ ] UFW: chỉ mở 22 (SSH) + 80/443 (Kong); chặn 3001/8080/8001 ra ngoài (`sudo ufw allow 22,80,443/tcp && sudo ufw enable`).
- [ ] SPF/DKIM/DMARC cho domain email (giảm spam); hoặc chuyển sang SES/SendGrid khi gửi số lượng lớn.
- [ ] Google OAuth: thêm redirect URI production vào Google Cloud Console; **reset client secret** nếu từng lộ.
- [ ] Cron `pg_dump` hằng đêm + kiểm tra khôi phục thử 1 lần.
