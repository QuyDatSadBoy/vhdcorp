# VHD Corp — Tài liệu bàn giao & test trước khi giao khách

> **Version:** 1.0 · **Ngày:** 2026-05-19
> **Tagline:** Kết nối giá trị – Hợp tác vững bền
> **Mục đích:** Tổng hợp tài khoản, URL, tính năng và checklist test để khách hàng nghiệm thu toàn bộ hệ thống.

---

## 1. Khởi động hệ thống

### 1.1 Yêu cầu

- Node.js ≥ 20, **Yarn** (không dùng npm/pnpm)
- PostgreSQL 14+ chạy local, database `vhdcorp_dev`
- File `.env` trong `be/` và `fe/` (xem README mỗi app)

### 1.2 Lệnh chạy dev

```bash
# Terminal 1 — Backend (NestJS, port 8080)
cd be
yarn install
yarn prisma migrate deploy
yarn prisma db seed         # tạo tài khoản admin + dữ liệu mẫu
yarn start:dev

# Terminal 2 — Frontend (Next.js 16, port 3001)
cd fe
yarn install
PORT=3001 yarn dev
```

### 1.3 URL truy cập

| App                   | URL                               | Ghi chú                           |
| --------------------- | --------------------------------- | --------------------------------- |
| Client (site công ty) | http://localhost:3001/            | Public — không cần đăng nhập      |
| Admin (quản trị)      | http://localhost:3001/admin/login | Yêu cầu role `admin` hoặc `staff` |
| Backend API           | http://localhost:8080/api         | Swagger (nếu bật): `/api/docs`    |
| Backend health        | http://localhost:8080/api/health  |                                   |

---

## 2. Tài khoản đăng nhập

> Tất cả tài khoản dưới đây được tạo tự động khi chạy `yarn prisma db seed` (file [be/prisma/seed.ts](be/prisma/seed.ts)).

### 2.1 Tài khoản Admin (quản trị viên cấp cao nhất)

| Trường        | Giá trị                           |
| ------------- | --------------------------------- |
| **Email**     | `admin@vhdcorp.vn`                |
| **Mật khẩu**  | `admin123`                        |
| Role          | `admin`                           |
| Đăng nhập tại | http://localhost:3001/admin/login |

> **Lưu ý bảo mật:** Trang `/admin/login` **chỉ cho phép đăng nhập bằng email/password**, không có Google OAuth (theo yêu cầu PRD §4). Sau khi bàn giao, vào `/admin/users/[id]` đổi mật khẩu hoặc tạo tài khoản admin mới rồi xóa tài khoản seed.

### 2.2 Tài khoản khách hàng (test luồng client)

Có thể tự đăng ký mới tại http://localhost:3001/register (email/password hoặc Google OAuth). Hoặc dùng tài khoản seed nếu có (xem `be/prisma/seed.ts`).

---

## 3. Tính năng — Phía Client (http://localhost:3001/)

### 3.1 Trang công khai

| Route                | Tên               | Tính năng                                                                                                                                                                                                |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Trang chủ         | Hero 3D, marquee thương hiệu, sản phẩm nổi bật, blog preview, CTA liên hệ, testimonials, partners. Toàn bộ section render từ `SiteConfig` JSONB nên admin có thể đổi thứ tự + nội dung qua Page Builder. |
| `/products`          | Sản phẩm          | Danh sách + filter theo danh mục + sort (mới nhất / giá tăng/giảm / phổ biến) + infinite scroll                                                                                                          |
| `/products/[slug]`   | Chi tiết sản phẩm | Gallery zoom, thông số kỹ thuật, mô tả rich-text, CTA "Liên hệ đặt hàng", sản phẩm liên quan, structured data `Product`                                                                                  |
| `/categories/[slug]` | Danh mục          | Hiển thị sản phẩm thuộc danh mục, breadcrumb                                                                                                                                                             |
| `/posts`             | Tin tức           | Danh sách bài viết + filter tag                                                                                                                                                                          |
| `/posts/[slug]`      | Bài viết          | Nội dung rich-text, bài liên quan, JSON-LD `Article`                                                                                                                                                     |
| `/about`             | Giới thiệu        | Câu chuyện thương hiệu, đội ngũ, sticky story scroll animation                                                                                                                                           |
| `/contact`           | Liên hệ           | Form RHF + Zod, gửi vào DB, hiện toast thành công, có map                                                                                                                                                |
| `/search`            | Tìm kiếm          | Full-text search sản phẩm + bài viết, query string `?q=`                                                                                                                                                 |

### 3.2 Trang xác thực & tài khoản

| Route               | Tính năng                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `/login`            | Email/password + nút **"Đăng nhập bằng Google"**. Sau login redirect về `?next=` hoặc `/account/profile`. |
| `/register`         | Đăng ký mới (email/password hoặc Google), auto-login.                                                     |
| `/callback`         | Xử lý redirect sau Google OAuth (BE đã set cookie HttpOnly).                                              |
| `/account/profile`  | Xem & cập nhật avatar, tên, số điện thoại, địa chỉ. **Protected** — middleware redirect nếu chưa login.   |
| `/account/password` | Đổi mật khẩu (ẩn nếu là tài khoản Google OAuth).                                                          |

### 3.3 Đặc tả kỹ thuật quan trọng

- **Theme:** Toggle dark/light ở header (next-themes), persist `localStorage`.
- **Ngôn ngữ:** Chỉ tiếng Việt, mọi UI string ở `fe/messages/vi.json`.
- **SEO:** Mỗi route có `generateMetadata`, Open Graph + Twitter Card, JSON-LD (`Organization`, `Product`, `Article`, `BreadcrumbList`), `/sitemap.xml` + `/robots.txt` tự sinh.
- **Performance:** `next/image` + `sizes` + `priority`, dynamic import cho heavy components.
- **Brand palette:** Primary `#1B3A8C` (navy), Accent `#4FB8E7` (cyan), Highlight `#F5A623` (amber). Đọc từ CSS variables `--vhd-color-*`.
- **Animation:** Framer Motion + GSAP ScrollTrigger, marquee, 3D (R3F) ở hero.

---

## 4. Tính năng — Phía Admin (http://localhost:3001/admin/)

> Đăng nhập bằng `admin@vhdcorp.vn` / `admin123` tại `/admin/login`.

### 4.1 Dashboard — `/admin/dashboard`

- KPI: tổng lượt xem, số sản phẩm, số bài viết, người dùng mới
- Biểu đồ recharts: lượt xem 7/30 ngày, top sản phẩm, phân bố theo danh mục
- Hỗ trợ **dark/light mode** đồng bộ với header toggle

### 4.2 Quản lý nội dung — CRUD đầy đủ

| Module           | Route                                  | Tính năng                                                                                                                |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Sản phẩm**     | `/admin/products` · `/new` · `/[id]`   | Tạo, sửa, xóa (soft delete), upload nhiều ảnh, rich editor mô tả, SEO meta override, set giá, tag, tồn kho, gán category |
| **Danh mục**     | `/admin/categories` · `/new` · `/[id]` | Cây đa cấp, slug tự động không dấu, thứ tự hiển thị, ảnh đại diện                                                        |
| **Bài viết**     | `/admin/posts` · `/new` · `/[id]`      | Rich editor (TinyMCE/Tiptap), SEO meta, publish/draft/schedule, gắn tag                                                  |
| **Người dùng**   | `/admin/users` · `/[id]`               | Xem danh sách, phân quyền `customer/staff/admin`, block/unblock                                                          |
| **Đánh giá**     | `/admin/reviews` · `/[id]`             | Duyệt/ẩn review, trả lời (nếu bật)                                                                                       |
| **Banner**       | `/admin/banners` · `/new` · `/[id]`    | Upload, đặt vị trí (`position` string), link, bật/tắt, sort                                                              |
| **Thư viện ảnh** | `/admin/media`                         | Upload qua BE → Cloudinary/local fallback, lọc tag, copy URL                                                             |

### 4.3 ⭐ Visual Page Builder — `/admin/builder`

Layout 3 panel (Left 280px / Canvas / Right 320px), kéo thả sửa toàn bộ giao diện client **không cần code**.

**Left panel — Tabs:**

- **Sections:** Danh sách section trên trang đang chọn, drag handle reorder, toggle visible, xóa, nút "+ Thêm section"
- **Components:** Thư viện block: Hero, Banner, ProductGrid, BlogGrid, Testimonial, CTA, Divider, CustomHTML — kéo vào canvas
- **Pages:** Chọn trang để edit (Trang chủ / Giới thiệu / Liên hệ)
- **Theme:** Brand (logo, favicon, site name, tagline), Colors (color picker primary/accent/highlight/background/...), Typography (Google Fonts), Spacing, Border radius — live preview
- **History:** Timeline các version `Draft`/`Published`/`Current`, nút Restore, so sánh diff

**Center canvas:**

- Iframe nhúng FE với draft config
- Toggle responsive Mobile (375px) / Tablet (768px) / Desktop
- Click section → highlight, hiện Edit/Move/Duplicate/Delete
- Double-click text → inline edit
- Click ảnh → mở media picker

**Right panel — Properties:**

- Thay đổi theo element được chọn (Hero, Featured Products, Banner, Testimonial, ...)
- Animation entrance (Fade up / Slide / Zoom + delay)
- Section spacing, background (color/image/gradient), visibility

**Toolbar:**

- Undo/Redo (Ctrl+Z / Ctrl+Y, 50 steps)
- Preview (tab mới với draft)
- Save Draft (lưu vào DB, chưa publish)
- 🚀 Publish (apply config → production, tạo `SiteConfigHistory`)

### 4.4 Cài đặt — `/admin/settings`

- Thông tin công ty (tên, địa chỉ, hotline, email)
- Analytics ID (Google Analytics, Facebook Pixel)
- SEO mặc định toàn site (title template, description, OG image)
- Social links

### 4.5 Đặc tả admin

- **Theme:** Dark/light mode đồng bộ, toggle ở sidebar admin
- **Chart:** Recharts với theme-aware colors, gradient fill, tooltip custom, responsive
- **DataTable:** Sort, filter, pagination, bulk actions
- **Bảo mật:** JWT HttpOnly cookie, middleware kiểm tra role `admin`/`staff`, không có Google OAuth ở trang admin login

---

## 5. Tính năng — Phía Backend (http://localhost:8080/api)

### 5.1 Module map

| Module           | Endpoints chính                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authentication` | `POST /auth/login` · `/register` · `/refresh` · `/logout` · `GET /auth/google` · `/auth/google/callback` · `/auth/me`                                       |
| `product`        | `GET/POST/PUT/DELETE /products` · `/products/admin` · `/products/:slug`                                                                                     |
| `category`       | `GET/POST/PUT/DELETE /categories` (cây đa cấp)                                                                                                              |
| `post`           | `GET/POST/PUT/DELETE /posts` · `/posts/admin` · `/posts/:slug`                                                                                              |
| `user`           | `GET/POST/PUT/DELETE /users` · `/users/profile` (self)                                                                                                      |
| `review`         | `GET/POST/PUT/DELETE /reviews` · `/reviews/admin`                                                                                                           |
| `banner`         | `GET/POST/PUT/DELETE /banners` · `/banners/admin`                                                                                                           |
| `media`          | `POST /media/upload` (multipart) · `GET/DELETE /media`                                                                                                      |
| `site-config`    | `GET /site-config` (published) · `GET/PUT /site-config/draft` · `POST /site-config/publish` · `GET /site-config/history` · `POST /site-config/rollback/:id` |
| `contact`        | `POST /contact` (gửi form từ client) · `GET /contact/admin`                                                                                                 |
| `statistics`     | `GET /statistics/overview` · `/timeseries` · `/categories-breakdown` · `/top-products`                                                                      |
| `health`         | `GET /health`                                                                                                                                               |

### 5.2 Đặc tả backend

- **Framework:** NestJS feature-module, mỗi domain 1 module riêng
- **ORM:** Prisma + PostgreSQL, 9 models chính (xem [docs/DATABASE.md](docs/DATABASE.md))
- **Auth:** JWT access (15min) + refresh (7d) → **HttpOnly Cookie**, refresh hash bcrypt lưu `User.refreshTokenHash`
- **Soft delete:** Product, Post, User dùng `deletedAt`, không xóa thật
- **Validation:** DTO + `class-validator`, sanitize HTML interceptor cho rich content
- **Security:** Helmet, CSRF guard, `@nestjs/throttler` rate limit, `@Roles('admin')` trên admin endpoints
- **Media:** Cloudinary SDK + local fallback, lưu metadata + URL vào `Media`

---

## 6. Checklist nghiệm thu (test trước khi bàn giao)

### 6.1 Client

- [ ] Trang chủ load < 2.5s, hero animation chạy mượt, marquee không bị cắt chữ
- [ ] Toggle dark/light: mọi section đều có style dark phù hợp
- [ ] Header sticky, mobile menu mở/đóng đúng, logo nét trên cả 2 mode
- [ ] `/products`: filter danh mục + sort hoạt động, infinite scroll load tiếp
- [ ] `/products/[slug]`: gallery zoom được, CTA liên hệ hiện modal/form, related products đúng category
- [ ] `/posts/[slug]`: rich content hiển thị đúng (h1-h6, img, list, blockquote, code)
- [ ] `/contact`: submit form → toast thành công, dữ liệu vào DB (`Contact` table)
- [ ] `/search?q=...`: trả về cả sản phẩm + bài viết
- [ ] `/register` → tạo tài khoản → auto login → redirect `/account/profile`
- [ ] Google OAuth: click "Đăng nhập bằng Google" → consent → cookie set → redirect đúng
- [ ] `/account/profile`: cập nhật avatar, tên, lưu thành công
- [ ] `/account/password`: đổi pass (tài khoản email), tài khoản Google không hiện trang này
- [ ] Logout: cookie bị xóa, redirect về `/`
- [ ] SEO: View source `/` thấy `<title>`, `<meta description>`, OG tags, JSON-LD `Organization`
- [ ] `/sitemap.xml` trả XML có URL products + posts
- [ ] `/robots.txt` chặn `/admin/`, `/api/`, `/account/`
- [ ] Lighthouse `/`, `/products`, `/products/[slug]`, `/posts/[slug]`: SEO ≥ 95, A11y ≥ 95

### 6.2 Admin

- [ ] `/admin/login` đăng nhập bằng `admin@vhdcorp.vn` / `admin123` → vào `/admin/dashboard`
- [ ] Dashboard hiển thị KPI + 4 biểu đồ recharts, đổi dark mode chart vẫn đẹp
- [ ] `/admin/products`: tạo mới → upload ảnh → save → xuất hiện ở client `/products`
- [ ] `/admin/products/[id]`: edit description (rich editor), chèn ảnh upload, save thành công
- [ ] `/admin/categories`: tạo danh mục cha + con, kiểm tra slug tự sinh không dấu
- [ ] `/admin/posts/new`: viết bài, set publish status, save → hiện ở `/posts`
- [ ] `/admin/banners/new`: upload banner, set position, toggle active, kiểm tra hiện ở client
- [ ] `/admin/media`: upload nhiều file, tìm theo tag, copy URL
- [ ] `/admin/users`: đổi role một tài khoản → tài khoản đó mất/được quyền tương ứng
- [ ] `/admin/reviews`: duyệt review → hiện ở trang sản phẩm
- [ ] `/admin/settings`: cập nhật thông tin công ty → header/footer client cập nhật
- [ ] `/admin/builder`:
  - [ ] Tab **Sections** → reorder bằng drag-drop, toggle visible, xóa, thêm mới
  - [ ] Tab **Components** → kéo Hero/Banner/CTA vào canvas
  - [ ] Tab **Theme** → đổi màu Primary, live preview canvas đổi màu ngay
  - [ ] Tab **History** → xem timeline, Restore version cũ
  - [ ] Toolbar: Undo/Redo, Mobile/Tablet/Desktop toggle width canvas
  - [ ] Save Draft → reload trang vẫn còn
  - [ ] Publish → mở tab mới `/` thấy thay đổi áp dụng

### 6.3 Backend (test bằng Postman/curl với cookie admin)

- [ ] `GET /api/health` trả 200
- [ ] `POST /api/auth/login` với credentials đúng → trả user, set 2 cookies HttpOnly
- [ ] `GET /api/auth/me` (với cookie) → trả profile admin
- [ ] `GET /api/products` (public) → list sản phẩm published
- [ ] `GET /api/products/admin` (admin cookie) → list cả draft
- [ ] CRUD `/api/banners` đầy đủ POST/PUT/DELETE
- [ ] `PUT /api/site-config/draft` → `POST /api/site-config/publish` → `GET /api/site-config` trả config mới
- [ ] `GET /api/statistics/overview` trả KPI
- [ ] `POST /api/media/upload` (multipart) → trả URL Cloudinary/local
- [ ] `POST /api/contact` từ client form → record vào DB
- [ ] Endpoint admin gọi không cookie → 401; gọi với cookie role `customer` → 403
- [ ] Rate limit: gọi `/api/auth/login` quá ngưỡng → 429
- [ ] Logout → cookie bị clear, `GET /api/auth/me` trả 401

### 6.4 Bảo mật & vận hành

- [ ] JWT trong **HttpOnly Cookie**, không trả trong response body
- [ ] Refresh token được hash bcrypt trong DB
- [ ] Admin endpoints có `@Roles('admin')` hoặc `@Roles('admin','staff')`
- [ ] HTML từ rich editor bị sanitize ở BE (không chèn `<script>` được)
- [ ] Helmet headers có mặt (`X-Frame-Options`, `Strict-Transport-Security`, ...)
- [ ] CORS chỉ cho phép origin frontend
- [ ] Backup DB: `pg_dump vhdcorp_dev > backup.sql`

---

## 7. Tài liệu liên quan

| File                                               | Nội dung                                             |
| -------------------------------------------------- | ---------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                         | Spec đầy đủ: route, auth flow, builder, dependencies |
| [docs/DATABASE.md](docs/DATABASE.md)               | 9 models Prisma, index strategy, ERD                 |
| [docs/FINAL_REPORT_V6.md](docs/FINAL_REPORT_V6.md) | Báo cáo round audit & test gần nhất                  |
| [be/prisma/seed.ts](be/prisma/seed.ts)             | Script seed tài khoản admin + dữ liệu mẫu            |
| [AGENTS.md](AGENTS.md)                             | Quy tắc code & cấu trúc thư mục                      |

---

## 8. Liên hệ hỗ trợ sau bàn giao

- **Source code:** Repository Git của dự án (branch `main`)
- **Database:** PostgreSQL `vhdcorp_dev` — thay đổi schema phải chạy `yarn prisma migrate dev`
- **Đổi mật khẩu admin sau bàn giao:** Vào `/admin/users` → tìm `admin@vhdcorp.vn` → đặt lại mật khẩu, hoặc tạo tài khoản admin mới rồi xóa tài khoản seed
- **Khôi phục dữ liệu mẫu:** `cd be && yarn prisma migrate reset` (CẢNH BÁO: xóa toàn bộ DB rồi seed lại)

---

> ✅ **Sẵn sàng bàn giao** khi toàn bộ checklist §6 đã được tick xanh và Lighthouse SEO/A11y ≥ 95 trên 4 route đại diện.
