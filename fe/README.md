# VHD Corp — Frontend

Next.js 16 App Router · React 19 · Tailwind CSS v4 · shadcn/ui · TypeScript

> **Package manager: `yarn`** — KHÔNG dùng npm, pnpm, hay bun.

## Khởi động

```bash
cp .env.example .env.local   # điền NEXT_PUBLIC_API_URL=http://localhost:8333
yarn install
```

## Chạy

| Lệnh           | Mô tả                                  |
| -------------- | -------------------------------------- |
| `yarn dev`     | Dev server tại <http://localhost:3000> |
| `yarn dev:log` | Dev + ghi log → `logs/app.log`         |
| `yarn build`   | Build production                       |
| `yarn start`   | Chạy production build                  |
| `yarn lint`    | Lint toàn bộ source                    |

## Xem log để debug

```bash
tail -f logs/app.log

# Lọc lỗi
grep -i "error" logs/app.log
```

## Cấu trúc thư mục

```text
app/
├── (client)/    # Client routes: /, /products, /posts, /about, /contact
├── (auth)/      # /login, /register, /auth/callback
├── account/     # /account/* — protected, cần đăng nhập
└── admin/       # /admin/* — protected, cần role admin/staff

components/
├── client/      # Header, Footer, Card, ...
├── admin/       # Sidebar, DataTable, ...
├── builder/     # Visual Page Builder
└── ui/          # shadcn/ui primitives — chỉ thêm mới, không sửa

services/        # {domain}.service.ts — TanStack Query hooks + axios
store/           # {name}.store.ts — Zustand
hooks/           # use-{name}.ts — custom hooks
lib/             # axios.ts, utils.ts, cloudinary.ts
types/           # {domain}.ts — TypeScript interfaces
messages/        # vi.json, en.json — next-intl strings
public/          # static assets (icons/, images/)
```

## Env quan trọng

| Biến                                | Mô tả                                     |
| ----------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | URL backend, vd: `http://localhost:8333`  |
| `NEXT_PUBLIC_APP_URL`               | URL frontend, vd: `http://localhost:3000` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                     |
| `NEXT_PUBLIC_GA_ID`                 | Google Analytics (tùy chọn)               |

Xem mẫu đầy đủ tại `.env.example`.
