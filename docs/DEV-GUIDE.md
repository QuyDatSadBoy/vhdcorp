# DEV-GUIDE — Chạy ứng dụng VHD Corp ở môi trường dev

Hướng dẫn từng bước để cài, seed và chạy cả backend (NestJS) và frontend (Next.js) trên máy local. Test bằng tài khoản đã seed sẵn hoặc tự đăng ký.

---

## 1. Yêu cầu môi trường

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
| --- | --- | --- |
| Node.js | 20.x (LTS) | Khuyến nghị 20.18+ |
| Yarn | 1.22+ | **Bắt buộc dùng yarn**, KHÔNG dùng npm/pnpm/bun |
| PostgreSQL | 15+ | Có thể chạy native hoặc Docker |
| Git | bất kỳ | |

Kiểm tra:

```bash
node -v        # v20.x
yarn -v        # 1.22.x
psql --version # psql 15+
```

---

## 2. Tạo database PostgreSQL

```bash
# Native postgres
sudo -u postgres psql -c "CREATE DATABASE vhdcorp_dev;"
sudo -u postgres psql -c "CREATE USER vhdcorp WITH PASSWORD 'vhdcorp';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vhdcorp_dev TO vhdcorp;"
```

Hoặc Docker:

```bash
docker run --name vhdcorp-pg -e POSTGRES_PASSWORD=vhdcorp \
  -e POSTGRES_USER=vhdcorp -e POSTGRES_DB=vhdcorp_dev \
  -p 5432:5432 -d postgres:16
```

---

## 3. Cấu hình biến môi trường

### 3.1 Backend — `be/.env`

```dotenv
# Server
PORT=8080
NODE_ENV=development
APP_URL=http://localhost:8080
WEB_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://vhdcorp:vhdcorp@localhost:5432/vhdcorp_dev?schema=public"

# JWT
JWT_ACCESS_SECRET=replace-with-strong-random-string
JWT_REFRESH_SECRET=replace-with-another-random-string
JWT_ACCESS_TTL=900            # 15 phút
JWT_REFRESH_TTL=604800        # 7 ngày

# Cookie
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false           # true khi deploy HTTPS

# Google OAuth (tùy chọn — nếu để trống chỉ login email/password)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

# Cloudinary (tùy chọn — nếu trống sẽ fallback lưu local /uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Throttle
THROTTLE_TTL=10000
THROTTLE_LIMIT=20
```

### 3.2 Frontend — `fe/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

---

## 4. Cài đặt và seed dữ liệu (lần đầu)

### 4.1 Backend

```bash
cd be
yarn install

# Tạo schema + migrations
yarn prisma generate
yarn prisma migrate dev

# Seed dữ liệu mẫu (admin, danh mục, sản phẩm, bài viết, site config)
yarn prisma:seed
```

Sau bước seed, database có:

- **1 tài khoản admin**: `admin@vhdcorp.vn` / `admin123`
- 4 danh mục mẫu
- 9 sản phẩm mẫu
- 8 bài viết mẫu
- SiteConfig mặc định (brand, navigation, footer, theme)

### 4.2 Frontend

```bash
cd ../fe
yarn install
```

---

## 5. Chạy dev mode

Mở **2 terminal song song**.

### Terminal 1 — Backend

```bash
cd be
yarn start:dev
# → API chạy ở http://localhost:8080/api
# → Health check: http://localhost:8080/api/health
```

### Terminal 2 — Frontend

```bash
cd fe
yarn dev
# → Web chạy ở http://localhost:3000
```

(Tùy chọn) Prisma Studio để xem/sửa dữ liệu trực quan:

```bash
cd be
npx prisma studio
# → http://localhost:5555
```

---

## 6. Tài khoản test

### 6.1 Admin (đã seed sẵn)

| Field | Giá trị |
| --- | --- |
| URL | <http://localhost:3000/admin/login> |
| Email | `admin@vhdcorp.vn` |
| Mật khẩu | `admin123` |
| Ghi chú | Trang admin **chỉ chấp nhận email/password**, không có Google OAuth |

Vào được dashboard → đầy đủ menu: Sản phẩm, Bài viết, Danh mục, Người dùng, Đánh giá, Banner, Media, Cài đặt, Page Builder.

### 6.2 Customer (tự đăng ký để test)

1. Mở <http://localhost:3000/register>
2. Nhập:
   - Họ tên: `Test User`
   - Email: bất kỳ (vd `test@vhdcorp.vn`)
   - Mật khẩu: tối thiểu 8 ký tự (vd `Test@1234`)
3. Submit → tự động đăng nhập, redirect về trang chủ.

Tài khoản này có role `CUSTOMER`, vào được `/account/profile`, `/account/password`. Không vào được `/admin/*`.

Hoặc đăng nhập bằng Google (nếu đã set `GOOGLE_CLIENT_ID/SECRET` ở `.env`):

- Click **"Đăng nhập bằng Google"** ở `/login`.
- Lần đầu sẽ tạo user mới với role `CUSTOMER`.

---

## 7. URL chính

| Trang | URL |
| --- | --- |
| Trang chủ | <http://localhost:3000/> |
| Sản phẩm | <http://localhost:3000/products> |
| Bài viết | <http://localhost:3000/posts> |
| Tìm kiếm | <http://localhost:3000/search> |
| Liên hệ | <http://localhost:3000/contact> |
| Đăng nhập client | <http://localhost:3000/login> |
| Đăng ký | <http://localhost:3000/register> |
| Hồ sơ | <http://localhost:3000/account/profile> |
| **Admin login** | <http://localhost:3000/admin/login> |
| Admin dashboard | <http://localhost:3000/admin/dashboard> |
| Page Builder | <http://localhost:3000/admin/builder> |
| API | <http://localhost:8080/api> |
| API health | <http://localhost:8080/api/health> |
| Prisma Studio | <http://localhost:5555> |

---

## 8. Reset & seed lại từ đầu

Nếu muốn xóa toàn bộ dữ liệu và seed lại:

```bash
cd be
yarn prisma migrate reset    # xác nhận Y → drop DB, migrate, run seed
```

Hoặc giữ schema, chỉ reset data:

```bash
cd be
yarn prisma db push --force-reset
yarn prisma:seed
```

---

## 9. Troubleshooting

| Vấn đề | Cách xử lý |
| --- | --- |
| `EADDRINUSE :8080` / `:3000` | `lsof -i :8080` rồi `kill -9 <pid>` |
| `Can't reach database server` | Kiểm tra postgres đang chạy: `pg_isready` |
| `403 Forbidden CSRF` ở admin | Xóa cookie `csrf-token` ở DevTools rồi refresh |
| Login admin fail | Chạy lại `yarn prisma:seed` để chắc chắn user admin tồn tại |
| Build FE lỗi messages/locale | `rm -rf fe/.next && yarn dev`; kiểm tra `fe/messages/vi.json` tồn tại |
| UI string không hiện | Bổ sung key trong `fe/messages/vi.json`; dự án không hỗ trợ đổi ngôn ngữ |

---

## 10. Build production (tham khảo)

```bash
# Backend
cd be
yarn build
yarn start:prod   # cần chạy migrate + seed trước trên DB prod

# Frontend
cd ../fe
yarn build
yarn start -p 3000
```
