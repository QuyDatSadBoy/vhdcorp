# VHD Corp

Monorepo: **NestJS** backend + **Next.js** frontend.

> **Package manager: `yarn`** — KHÔNG dùng npm, pnpm, hay bun.

> ⚠️ **KHÔNG tạo `yarn.lock` ở repo root.** Chỉ `fe/yarn.lock` và `be/yarn.lock`. Nếu có lockfile ở root, Next/Tailwind sẽ suy luận workspace root sai và dev server fail với lỗi `Can't resolve 'tailwindcss'`. Nếu cần cài devtools ở root: `yarn install --no-lockfile`.

> ⚠️ **Linux inotify limit**: Turbopack cần nhiều file watcher. Nếu gặp `OS file watch limit reached`, chạy: `sudo sysctl -w fs.inotify.max_user_watches=1048576 fs.inotify.max_user_instances=1024` (đã persist trong `/etc/sysctl.conf` trên máy dev).

## Stack

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Backend  | NestJS 11, Prisma 7, PostgreSQL, Passport JWT                             |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query |

## Cấu trúc

```text
vhdcorp/
├── be/        # NestJS API — cổng 8080
├── fe/        # Next.js client — cổng 3001
├── agent/     # AI chat agent (FastAPI + LangGraph) — cổng 8001
└── docs/      # PRD, design docs (AGENT_PLAN.md cho agent)
```

## Khởi động

**Yêu cầu**: Node.js ≥ 20 + `yarn`, Python 3.13 + [`uv`](https://docs.astral.sh/uv/), PostgreSQL 16 (khuyên dùng Docker), tài khoản Cloudinary (ảnh) + Gmail app-password (email/OTP).

### 0. PostgreSQL (Docker)

```bash
docker run -d --name vhdcorp-postgres --restart unless-stopped \
  -e POSTGRES_PASSWORD=<mật_khẩu> -e POSTGRES_DB=vhdcorp_dev -p 5432:5432 postgres:16
# DATABASE_URL=postgresql://postgres:<mật_khẩu>@localhost:5432/vhdcorp_dev
```

> Sau khi reboot máy: `docker start vhdcorp-postgres` (flag `--restart unless-stopped` đã tự làm việc này).

### 1. Backend

```bash
cd be
cp .env.example .env        # điền DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
yarn install
yarn prisma:generate
yarn prisma:migrate
yarn prisma:seed
yarn start:dev              # dev (hot reload)
yarn start:log              # dev + ghi log → be/logs/app.log
```

### 2. Frontend

```bash
cd fe
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:8080/api
yarn install
PORT=3001 yarn dev          # dev
yarn dev:log                # dev + ghi log → fe/logs/app.log
```

### 3. AI Agent (chat widget)

```bash
cd agent
cp .env.example .env        # điền GOOGLE_API_KEY, CATALOG_DATABASE_URL (đọc DB trực tiếp), TAVILY_API_KEYS, GMAIL_IMAP_*, MINIMAX_API_KEY, LANGSMITH_*
./run.sh                    # FastAPI + LangGraph — cổng 8001
uv run pytest               # test (57 test)
```

Trợ lý AI phủ **đủ mọi module của web**: sản phẩm/giá/tồn kho + bài viết + danh mục + gợi ý "khách xem X cũng xem Y" (tracking thật) + thông tin công ty — tất cả **đọc TRỰC TIẾP PostgreSQL** qua `CATALOG_DATABASE_URL` (fallback `data/products.json` đồng bộ webhook ~0.25s khi DB lỗi). Thông tin chính sách sửa tại **Admin → Kiến thức AI**. Gen-UI trong chat: carousel sản phẩm, thẻ bài viết, chip danh mục, form liên hệ/báo giá, bảng so sánh, FAQ — **reload vẫn giữ nguyên**; lần đầu vào web panel tự mở kèm câu hỏi mẫu. Voice (Web Speech + MiniMax TTS cache), tìm sản phẩm bằng ảnh, gửi liên hệ, A2A (`/.well-known/agent-card.json`), MCP (`/mcp`), đọc Gmail (endpoint admin). Đồng bộ catalog thủ công: `POST /api/admin/resync-products` (header `X-Resync-Secret`). FE cần `NEXT_PUBLIC_AGENT_URL=http://localhost:8001` trong `fe/.env.local`.

> ⚙️ **Vận hành + CI/CD hằng ngày**: [docs/VANHANH.md](docs/VANHANH.md) — quy trình push/merge, test lại PR, theo dõi server, cảnh báo, rollback.

> 🚀 **Deploy lần đầu**: [docs/DEPLOY.md](docs/DEPLOY.md) — VPS Ubuntu (Postgres cài thẳng + Kong Gateway + PM2), push `main` là tự build & chạy lại. Có sẵn mục hướng dẫn cho Claude Code agent chạy trên VPS.

> 📄 **Tài liệu**: [docs/TINH_NANG.md](docs/TINH_NANG.md) (**đọc file này trước** — toàn bộ tính năng + kiến trúc + agent) · [docs/BAO_CAO.md](docs/BAO_CAO.md) (báo cáo bàn giao) · [docs/AGENT_PLAN.md](docs/AGENT_PLAN.md) (kiến trúc agent) · [docs/HANDOVER.md](docs/HANDOVER.md) (changelog kỹ thuật từng đợt) · [docs/DATABASE.md](docs/DATABASE.md) · [docs/PRD.md](docs/PRD.md).

## Nghiệm thu tự động

```bash
# Chạy khi cả 3 service đang bật (BE 8080, FE 3001, Agent 8001)
S=/tmp/vhd-test BELOG=<đường_dẫn_log_be> bash scripts/round-full.sh   # PASS khi in ROUND_RESULT=0
cd agent && uv run pytest                                             # 57 test
cd fe && yarn tsc --noEmit && cd ../be && yarn tsc --noEmit           # typecheck
```

## Xem log để debug

```bash
# Backend
tail -f be/logs/app.log

# Frontend
tail -f fe/logs/app.log

# Cả hai cùng lúc
tail -f be/logs/app.log fe/logs/app.log
```

## Scripts

| Lệnh                          | Mô tả                                   |
| ----------------------------- | --------------------------------------- |
| `cd be && yarn start:dev`     | Backend dev (hot reload)                |
| `cd be && yarn start:log`     | Backend dev + log ra `be/logs/app.log`  |
| `cd be && yarn start:prod`    | Production (`node dist/main`)           |
| `cd be && yarn prisma:seed`   | Seed dữ liệu mẫu                        |
| `cd be && yarn prisma:reset`  | Reset database                          |
| `cd be && yarn prisma studio` | Prisma Studio GUI                       |
| `cd fe && yarn dev`           | Frontend dev                            |
| `cd fe && yarn dev:log`       | Frontend dev + log ra `fe/logs/app.log` |
| `cd fe && yarn build`         | Build production                        |

## Prisma

```bash
cd be

# Tạo migration mới sau khi sửa schema
yarn prisma migrate dev --name <tên_migration>

# Apply migration lên DB hiện tại (không tạo migration mới)
yarn prisma db push

# Xem DB qua GUI
yarn prisma studio

# Tái generate Prisma Client
yarn prisma:generate
```

## Env quan trọng

| Biến                 | Mô tả                                   |
| -------------------- | --------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string            |
| `JWT_ACCESS_SECRET`  | Secret cho access token (min 32 chars)  |
| `JWT_REFRESH_SECRET` | Secret cho refresh token (min 32 chars) |
| `COOKIE_SECRET`      | Secret cho cookie-parser signing        |
| `CORS_ORIGIN`        | `*` khi dev, domain cụ thể khi prod     |
| `FRONTEND_URL`       | URL FE để BE redirect OAuth callback    |

## Tài khoản mặc định (sau `yarn prisma:seed`)

- **Root admin (TỐI CAO)**: `vhdcorp.contact@gmail.com` / `<mật khẩu mặc định trong seed>` — đổi mật khẩu ngay khi lên production. Không ai xóa/đổi role/reset được tài khoản này.
- Đăng ký khách mới cần Gmail thật (OTP 6 số gửi về mail).

## Kiến trúc nhanh

- **JWT** lưu trong **HttpOnly Cookie** — không có trong body hay localStorage
- **Soft delete** cho User/Product/Post — dùng `deletedAt`, không `DELETE`
- **SiteConfig** (JSONB) → lưu brand, theme, nav, footer của toàn site
- **Admin login** chỉ email/password — không có Google OAuth
- API prefix mặc định: `/api` (ví dụ `/api/auth`, `/api/products`)
