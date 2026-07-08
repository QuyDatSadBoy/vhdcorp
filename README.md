# VHD Corp

Monorepo: **NestJS** backend + **Next.js** frontend.

> **Package manager: `yarn`** — KHÔNG dùng npm, pnpm, hay bun.

## Stack

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Backend  | NestJS 11, Prisma 7, PostgreSQL, Passport JWT                             |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query |

## Cấu trúc

```text
vhdcorp/
├── be/        # NestJS API — cổng 8333
├── fe/        # Next.js client — cổng 3000
└── docs/      # PRD, design docs
```

## Khởi động

### 1. Backend

```bash
cd be
cp .env.example .env        # điền DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
yarn install
yarn prisma migrate dev
yarn start:dev              # dev (hot reload)
yarn start:log              # dev + ghi log → be/logs/app.log
```

### 2. Frontend

```bash
cd fe
cp .env.example .env.local  # điền NEXT_PUBLIC_API_URL=http://localhost:8333
yarn install
yarn dev                    # dev
yarn dev:log                # dev + ghi log → fe/logs/app.log
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
| `cd be && yarn seed`          | Seed dữ liệu mẫu                        |
| `cd be && yarn reset`         | Reset database                          |
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
yarn prisma generate
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
- API prefix mặc định: không có (direct `/auth`, `/products`, …)
