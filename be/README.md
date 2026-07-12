# VHD Corp — Backend

NestJS 11 · Prisma 7 · PostgreSQL · Passport JWT · HttpOnly Cookie

> **Package manager: `yarn`** — KHÔNG dùng npm, pnpm, hay bun.

## Khởi động

```bash
cp .env.example .env   # điền DATABASE_URL, JWT secrets, COOKIE_SECRET
yarn install
yarn prisma migrate dev
```

## Chạy

| Lệnh               | Mô tả                          |
| ------------------ | ------------------------------ |
| `yarn start:dev`   | Dev với hot reload (port 8080) |
| `yarn start:log`   | Dev + ghi log → `logs/app.log` |
| `yarn start:debug` | Debug mode                     |
| `yarn start:prod`  | Production (`node dist/main`)  |

## Xem log để debug

```bash
tail -f logs/app.log

# Lọc theo level
grep "ERROR" logs/app.log
grep "WARN"  logs/app.log
```

## Prisma

```bash
# Tạo migration sau khi sửa schema
yarn prisma migrate dev --name <tên_migration>

# Apply schema không tạo migration
yarn prisma db push

# GUI xem dữ liệu
yarn prisma studio

# Tái generate client (sau khi sửa schema không migrate)
yarn prisma generate
```

## Seed / Reset

```bash
yarn prisma:seed    # seed dữ liệu mẫu vào DB
yarn prisma:reset   # xóa sạch và reset DB
```

## Test

```bash
yarn test          # unit tests
yarn test:e2e      # end-to-end tests
yarn test:cov      # coverage report
```

## Env quan trọng

| Biến                   | Bắt buộc | Mô tả                               |
| ---------------------- | -------- | ----------------------------------- |
| `DATABASE_URL`         | ✅       | PostgreSQL connection string        |
| `JWT_ACCESS_SECRET`    | ✅       | Min 32 chars                        |
| `JWT_REFRESH_SECRET`   | ✅       | Min 32 chars                        |
| `COOKIE_SECRET`        | ✅       | Min 32 chars                        |
| `GOOGLE_CLIENT_ID`     | OAuth    | Google Cloud Console                |
| `GOOGLE_CLIENT_SECRET` | OAuth    | Google Cloud Console                |
| `CLOUDINARY_*`         | Upload   | Cloudinary dashboard                |
| `CORS_ORIGIN`          | —        | `*` khi dev, domain cụ thể khi prod |
| `FRONTEND_URL`         | OAuth    | URL FE để redirect sau OAuth        |

Xem mẫu đầy đủ tại `.env.example`.

## License

Nest is [MIT licensed](LICENSE).
