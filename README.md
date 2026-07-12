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
cp .env.example .env        # điền GOOGLE_API_KEY, TAVILY_API_KEYS, GMAIL_IMAP_*, MINIMAX_API_KEY, LANGSMITH_*
./run.sh                    # FastAPI + LangGraph — cổng 8001
uv run pytest               # test (57 test)
```

Trợ lý AI: hỏi đáp sản phẩm **real-time 100% từ DB** (admin sửa → BE webhook đồng bộ ~0.25s, + auto-sync 30s dự phòng; cần `AGENT_URL`/`AGENT_RESYNC_SECRET`/`AGENT_ADMIN_SECRET` trong `be/.env`), thông tin công ty sửa tại **Admin → Kiến thức AI** (hoặc file `agent/data/knowledge.md`), gen-UI trong chat (carousel/form/so sánh/FAQ — **reload vẫn giữ nguyên**), voice (Web Speech + MiniMax TTS có cache), tìm sản phẩm bằng ảnh, gửi liên hệ, A2A (`/.well-known/agent-card.json`), MCP (`/mcp`), đọc Gmail (endpoint admin). Đồng bộ catalog thủ công: `POST /api/admin/resync-products` (header `X-Resync-Secret`). FE cần `NEXT_PUBLIC_AGENT_URL=http://localhost:8001` trong `fe/.env.local`.

> 📄 **Tài liệu**: [docs/BAO_CAO.md](docs/BAO_CAO.md) (báo cáo bàn giao tổng quan) · [docs/AGENT_PLAN.md](docs/AGENT_PLAN.md) (kiến trúc agent) · [docs/HANDOVER.md](docs/HANDOVER.md) (chi tiết kỹ thuật).

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

## Kiến trúc nhanh

- **JWT** lưu trong **HttpOnly Cookie** — không có trong body hay localStorage
- **Soft delete** cho User/Product/Post — dùng `deletedAt`, không `DELETE`
- **SiteConfig** (JSONB) → lưu brand, theme, nav, footer của toàn site
- **Admin login** chỉ email/password — không có Google OAuth
- API prefix mặc định: `/api` (ví dụ `/api/auth`, `/api/products`)
