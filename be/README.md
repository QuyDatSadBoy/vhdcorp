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

| Biến                   | Bắt buộc | Mô tả                                                |
| ---------------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`         | ✅       | PostgreSQL connection string                         |
| `JWT_ACCESS_SECRET`    | ✅       | Min 32 chars                                         |
| `JWT_REFRESH_SECRET`   | ✅       | Min 32 chars                                         |
| `COOKIE_SECRET`        | ✅       | Min 32 chars                                         |
| `GOOGLE_CLIENT_ID`     | OAuth    | Google Cloud Console                                 |
| `GOOGLE_CLIENT_SECRET` | OAuth    | Google Cloud Console                                 |
| `CLOUDINARY_*`         | Upload   | Cloudinary dashboard                                 |
| `CORS_ORIGIN`          | —        | `*` khi dev, domain cụ thể khi prod                  |
| `FRONTEND_URL`         | OAuth    | URL FE để redirect sau OAuth                         |
| `AGENT_URL`            | Agent    | URL service agent (mặc định `http://localhost:8001`) |
| `AGENT_ADMIN_SECRET`   | Agent    | Phải khớp `ADMIN_SECRET` trong `agent/.env`          |
| `AGENT_RESYNC_SECRET`  | Agent    | Phải khớp `RESYNC_SECRET` trong `agent/.env`         |

Xem mẫu đầy đủ tại `.env.example`.

## Cầu nối sang AI agent (`src/services/agent/`)

`AgentController` (`@Controller('agent')`, guard `JwtAuthGuard + RolesGuard`, `@Roles(ADMIN, STAFF)`)
là **proxy duy nhất** giữa FE và các endpoint admin của agent — secret của agent chỉ nằm ở BE,
không bao giờ ra browser:

- `GET/PUT /api/agent/knowledge` — Kiến thức AI
- `GET /api/agent/usage`, `GET /api/agent/top-ips`, `GET/PUT /api/agent/chat-limits`, `POST /api/agent/cache/clear`
- `POST /api/agent/ai/{product-description,post-draft,assistant}` (throttle 20–30 req/60s)
- `GET/POST /api/agent/deep/skills` + `DELETE /api/agent/deep/skills/:slug`
- `GET/POST /api/agent/deep/mcp` + `DELETE /api/agent/deep/mcp/:name`

Ngoài ra `AgentService.notifyProductsChanged()` bắn **fire-and-forget**
`POST {AGENT_URL}/api/admin/resync-products` sau mọi mutation product/category → catalog của
chat cập nhật trong ~0.25s. Chat công khai (SSE) **không** đi qua BE — FE gọi trực tiếp agent.

Chi tiết: [docs/AGENT_PLAN.md §12.8](../docs/AGENT_PLAN.md).

## License

Nest is [MIT licensed](LICENSE).
