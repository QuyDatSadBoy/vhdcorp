# Deploy VHD Corp lên VPS + CI/CD tự động

> Luồng: **push code lên nhánh `main`** → GitHub Actions SSH vào VPS → `scripts/deploy.sh` tự pull + build + restart. Không cần đụng tay vào VPS sau lần setup đầu.
> VPS khuyến nghị tối thiểu: **2 core / 4GB RAM / 35GB NVMe** (đã đo: 3 service production + Postgres ăn ~1.2–1.5GB RAM).

## 1. Setup VPS lần đầu (làm 1 lần duy nhất, ~20 phút)

```bash
# ── 1.1 Swap 4GB — BẮT BUỘC với VPS 4GB RAM (next build cần ~2GB đỉnh) ──
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# ── 1.2 Công cụ: Node 22 (nvm), uv (Python), PM2, Docker ──
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22 && npm i -g yarn pm2
curl -LsSf https://astral.sh/uv/install.sh | sh
curl -fsSL https://get.docker.com | sh

# ── 1.3 PostgreSQL (Docker, tự chạy lại sau reboot) ──
docker run -d --name vhdcorp-postgres --restart unless-stopped \
  -e POSTGRES_PASSWORD=<MẬT_KHẨU_MẠNH> -e POSTGRES_DB=vhdcorp_prod \
  -p 127.0.0.1:5432:5432 -v vhd_pgdata:/var/lib/postgresql/data postgres:16
docker exec vhdcorp-postgres psql -U postgres -d vhdcorp_prod -c "CREATE EXTENSION IF NOT EXISTS unaccent;"

# ── 1.4 Clone code + điền env ──
git clone <URL_REPO_GITHUB> ~/vhdcorp && cd ~/vhdcorp
cp be/.env.example be/.env        # điền DATABASE_URL (vhdcorp_prod), secrets JWT/COOKIE,
                                  # SMTP/Gmail, Cloudinary, ADMIN_EMAIL, GOOGLE_CLIENT_ID/SECRET,
                                  # AGENT_URL=http://localhost:8001 + 2 secret agent
cp fe/.env.example fe/.env.local  # NEXT_PUBLIC_API_URL=https://<domain>/api (hoặc http://IP:8080/api)
                                  # NEXT_PUBLIC_AGENT_URL=https://<domain-agent> (hoặc http://IP:8001)
cp agent/.env.example agent/.env  # GOOGLE_API_KEY, CATALOG_DATABASE_URL (trỏ vhdcorp_prod), Gmail, MiniMax…

# ── 1.5 Deploy lần đầu + seed ──
bash scripts/deploy.sh            # pull/build/PM2/health-check tự động
cd be && yarn prisma:seed         # tạo root admin + dữ liệu mẫu (chỉ lần đầu)
pm2 startup && pm2 save           # tự chạy lại toàn bộ sau reboot VPS
```

> Đổi ngay sau lần chạy đầu: mật khẩu root admin, mọi secrets trong `.env` (đừng dùng giá trị dev).

## 2. Bật CI/CD (GitHub Actions)

1. Tạo SSH key cho deploy (trên máy bạn): `ssh-keygen -t ed25519 -f vhd_deploy` → append `vhd_deploy.pub` vào `~/.ssh/authorized_keys` trên VPS.
2. GitHub repo → **Settings → Secrets and variables → Actions** → thêm:
   - `VPS_HOST` = IP VPS · `VPS_USER` = user SSH · `VPS_SSH_KEY` = nội dung file `vhd_deploy` (private key) · `VPS_PORT` = 22 (nếu khác thì đổi)
3. Xong. Từ giờ **merge/push vào `main` là VPS tự pull + build + restart** (xem tab Actions để theo dõi; deploy fail thì service cũ vẫn chạy vì PM2 chỉ reload khi build xong). Muốn deploy tay: tab Actions → "Deploy to VPS" → Run workflow, hoặc SSH vào VPS chạy `bash scripts/deploy.sh`.

## 3. Vận hành hằng ngày

```bash
pm2 status                  # trạng thái 3 service (vhd-be / vhd-fe / vhd-agent)
pm2 logs vhd-be --lines 100 # xem log
pm2 restart vhd-agent       # restart riêng 1 service
docker exec vhdcorp-postgres pg_dump -U postgres vhdcorp_prod > backup_$(date +%F).sql   # backup DB
```

## 4. Khuyến nghị thêm khi có domain

- **Nginx reverse proxy + HTTPS** (Certbot): trỏ `/` → 3001, `/api` → 8080, `/agent` → 8001; bật gzip. Khi đó đổi `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_AGENT_URL` sang domain, `CORS_ORIGIN` + `FRONTEND_URL` trong `be/.env` sang domain, và cấu hình SPF/DKIM cho email đỡ spam.
- `GOOGLE_CALLBACK_URL` đổi sang `https://<domain>/api/auth/google/callback` + thêm redirect URI này trong Google Cloud Console.
