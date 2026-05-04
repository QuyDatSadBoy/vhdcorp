# Base Full-Stack Web

Monorepo template: **NestJS** backend + **Next.js** frontend.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | NestJS 11, Prisma 7 (PostgreSQL), Passport JWT, Swagger |
| Frontend | Next.js 16, React 19, TailwindCSS 4, Zustand, React Query, shadcn/ui |

## Cấu trúc

```text
base_full_stack_web/
├── be/          # NestJS API server
└── fe/          # Next.js client app
```

## Khởi động nhanh

### Backend

```bash
cd be
cp .env.example .env   # cấu hình DATABASE_URL, JWT_SECRET, ...
npm install
npx prisma migrate dev
npm run start:dev
```

### Frontend

```bash
cd fe
cp .env.example .env   # cấu hình NEXT_PUBLIC_API_URL, ...
npm install
npm run dev
```

## Scripts hữu ích

| Lệnh | Mô tả |
| --- | --- |
| `be: npm run seed` | Seed dữ liệu mẫu |
| `be: npm run reset` | Reset database |
| `be: npm run start:log` | Chạy dev + ghi log vào `be/logs/app.log` |
| `fe: npm run dev:log` | Chạy dev + ghi log vào `fe/logs/app.log` |

# vhdcorp
# vhdcorp
