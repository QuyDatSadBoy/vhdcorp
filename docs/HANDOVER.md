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
| **Email**     | `admin@vhdcorp.com`               |
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

> Đăng nhập bằng `admin@vhdcorp.com` / `admin123` tại `/admin/login`.

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

- [ ] `/admin/login` đăng nhập bằng `admin@vhdcorp.com` / `admin123` → vào `/admin/dashboard`
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
- **Đổi mật khẩu admin sau bàn giao:** Vào `/admin/users` → tìm `admin@vhdcorp.com` → đặt lại mật khẩu, hoặc tạo tài khoản admin mới rồi xóa tài khoản seed
- **Khôi phục dữ liệu mẫu:** `cd be && yarn prisma migrate reset` (CẢNH BÁO: xóa toàn bộ DB rồi seed lại)

---

> ✅ **Sẵn sàng bàn giao** khi toàn bộ checklist §6 đã được tick xanh và Lighthouse SEO/A11y ≥ 95 trên 4 route đại diện.

---

## 9. Cập nhật 2026-07-09 — Hoàn thiện configurability + SEO + Contact

### Backend

- **Contact persistence**: model `Contact` mới (enum `ContactStatus` NEW/HANDLED) — `POST /api/contact` lưu DB; admin quản lý qua `GET /api/contact/admin`, `PUT /api/contact/:id/status`, `DELETE /api/contact/:id`.
- **Category SEO fields**: `description`, `metaTitle`, `metaDesc`, `ogImage` (migration `add_category_seo_fields`).
- **Hardening**: ValidationPipe whitelist (chặn mass-assignment) + gom lỗi nested; CORS production chỉ cho `FRONTEND_URL` (+`CORS_ORIGIN`); Swagger tắt ở production; rate-limit 5 lần/phút cho login/admin-login/register; Review setStatus/remove trả 404 sạch.

### Frontend — Admin cấu hình 100%

- **Các field từng "chết" nay hoạt động thật**: `customCss` (inject `<style>`), `googleAnalyticsId`/`googleTagManagerId`/`facebookPixelId` (inject script, ID được sanitize), `theme.fonts.heading/body` (Google Fonts tự load nếu ngoài Be Vietnam Pro/Inter), `theme.fonts.baseFontSize` (scale rem toàn site), `theme.spacing` (scale `--spacing` Tailwind v4), `theme.borderRadius`, `theme.colors.*` (wire vào shadcn tokens — button/ring/chart đổi theo brand, cả light lẫn dark).
- **Draft preview thật**: nút "Xem trước" builder → `/api/preview` (verify role ADMIN/STAFF qua BE) → Next draftMode → mọi trang render bản DRAFT + banner "Đang xem trước bản nháp"; thoát qua `/api/preview/disable`.
- **Settings mới**: tab Header (promo strip), Footer columns editor, footer contact/description/showMap, fonts/baseFontSize/spacing, SEO ogImage + defaultKeywords, tab Lịch sử (xem 50 bản, rollback vào draft).
- **Hộp thư liên hệ**: trang `/admin/contacts` (filter, đổi status, xóa, phân trang) + link sidebar.
- **Hardcode đã xóa**: promo strip header, mô tả + liên hệ footer, hotline StickyCtaBar/FloatingContact/contact-cta/product-detail, INFO cards trang liên hệ — tất cả đọc từ `SiteConfig`; giá trị rỗng thì ẨN (không còn số điện thoại giả).
- **Trang Liên hệ** render `pages.contact.sections` từ Page Builder (trên form).

### SEO

- `/products`, `/posts` server-render trang 1 (link crawlable trong HTML đầu, static + revalidate 60s); `/search` noindex.
- Product JSON-LD hết duplicate, thêm `aggregateRating` SSR; LocalBusiness trang liên hệ derive từ config (xóa phone/geo giả); JSON-LD escape `<` chống XSS.
- Title template `%s | VHD Corp` áp dụng nhất quán (product/post/category dùng `buildMetadata`).
- Bộ favicon PNG (16/32/48/180/192/512) + OG image 1200x630 sinh từ logo (`fe/public/icons/`, `fe/public/images/og-default.jpg`) + `app/icon.png` + manifest.
- `getSiteConfig` fetch với tag `site-config` + revalidate 60s → `POST /api/revalidate` sau publish có hiệu lực thật.
- Logo brand hiển thị ở: header, footer, hero, about, login, register, admin login (đọc từ `brand.logo.url`).

### Vận hành

- **KHÔNG tạo `yarn.lock` ở repo root** (vỡ resolve tailwind — xem README).
- inotify limits đã tăng trong `/etc/sysctl.conf` (Turbopack cần).
- Script one-off cập nhật config DB: `be/prisma/update-brand-assets.ts`.

### Vòng test tay full (2026-07-10) — kết quả & fix thêm

**Đã test như người test thật (Playwright browser, đúng kích thước 1854px + mobile 390px):**

- Client: home (8 màn cuộn, từng section), products (search/filter/sort), product detail, posts, about, contact (submit form thật → inbox), search (lọc live), login/register, menu mobile, dark mode.
- Admin: dashboard (charts), categories (tạo + SEO fields → verify meta trên client → xóa), products/posts form (Tiptap), banners/media/reviews/users load sạch, contacts (đổi trạng thái → DB).
- **Chỉnh UI 100% chứng minh bằng mắt**: đổi primary #7C3AED + radius 16 → toàn client đổi tím; font Montserrat → Google Fonts tự load + heading đổi thật; customCss → badge render; GA ID → script xuất hiện; revert sạch.
- Builder: thêm Hero → live-edit props trên canvas → lưu draft → preview draft trên trang thật (draftMode) → published không đổi → dọn draft.

**Fix trong vòng này:**

- Dải xám sai màu ở dark mode: 9 chỗ `bg-(--vhd-color-surface)/40|60` thiếu `dark:` variant → thêm `dark:bg-white/[0.03|0.04]`.
- Console 401 `/auth/me` trên mọi trang khách: thêm session-hint localStorage (`vhd_session`) — khách vãng lai không gọi API auth; set hint sau login/register/OAuth callback, xóa khi logout/401.
- Admin login bỏ qua `?next=` → đã tôn trọng (chỉ nhận path `/admin*`).
- Title template `%s | VHD Corp` áp dụng cho product/post detail (trước đó 2 trang này bỏ qua config).
- Lưu ý cache: Next 16 `revalidateTag` là stale-while-revalidate — sau publish, request đầu có thể còn bản cũ, request sau là bản mới (tối đa 60s theo TTL).

---

## 10. Email liên hệ (nodemailer)

`POST /api/contact` sau khi lưu DB sẽ gửi 2 email **fire-and-forget** (lỗi mail chỉ log, không hỏng API):

1. Thông báo cho admin (`ADMIN_EMAIL`) — nội dung liên hệ + ghi chú xem tại `/admin/contacts`.
2. Xác nhận cho khách — cảm ơn, tóm tắt yêu cầu, cam kết phản hồi 24h.

**Dry-run (mặc định)**: khi `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` trống, `MailService` (`be/src/services/mail/`) dùng JSON transport — email KHÔNG gửi thật, chỉ log `[MAIL:DRY-RUN] to=... subject=...` để test end-to-end.

**Khi có SMTP thật**: điền vào `be/.env` (khuyên dùng Gmail App Password hoặc Resend/Brevo SMTP):

| Env                                       | Ý nghĩa                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Host SMTP, port (587), TLS (`true` nếu port 465)     |
| `SMTP_USER` / `SMTP_PASS`                 | Tài khoản SMTP (Gmail: App Password)                 |
| `MAIL_FROM`                               | Người gửi, mặc định `VHD Corp <no-reply@vhdcorp.vn>` |
| `ADMIN_EMAIL`                             | Mail nhận thông báo liên hệ mới                      |

---

## 11. AI Chat Agent (2026-07-10) — service Python + widget

**Kiến trúc & tính năng chi tiết: [docs/AGENT_PLAN.md](AGENT_PLAN.md).** Đã test 3 vòng liên tiếp 100% (pytest 23 test + ma trận route/SEO/security + email + chat thật qua browser desktop & mobile).

### Chạy service (port 8001)

```bash
cd agent
./run.sh          # uv run uvicorn app.main:app --port 8001
uv run pytest     # 23 tests
uv run python scripts/sync_products.py   # đồng bộ lại catalog khi đổi sản phẩm
```

Env: `agent/.env` (đã điền GOOGLE_API_KEY + 13 Tavily keys + model `gemini-3-flash-preview`). FE cần `NEXT_PUBLIC_AGENT_URL=http://localhost:8001` trong `fe/.env.local` (đã có).

### Những gì agent làm được (đã verify)

- Hỏi đáp giá/tồn kho từ `agent/data/products.json` (fuzzy tiếng Việt không dấu), trả link sản phẩm → widget render card đẹp.
- Nhớ ngữ cảnh hội thoại (checkpoint SQLite); memory: 8 message gần nhất + summary + facts (tóm tắt chạy nền).
- Guardrail chặn prompt-injection, input quá dài, spam.
- Tìm web (Tavily, tự xoay 13 key) và **chủ động gửi liên hệ** (tool → `POST /api/contact` BE → inbox admin + 2 email).
- Quản lý hội thoại như ChatGPT: list/lịch sử/đổi tên/xóa, chỉ tạo khi có message đầu, cô lập theo user (uuid localStorage).

### Email liên hệ

**Đã gửi THẬT qua Gmail SMTP** (`backendt7.2023@gmail.com`, app-password trong `be/.env`) — mỗi liên hệ gửi 2 email: báo admin + xác nhận cho khách (template HTML brand + plain-text + header chống spam). Log `Đã gửi email tới ...` trong be log.
Đổi tài khoản gửi: sửa `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_EMAIL` trong `be/.env` (Gmail → App passwords, hoặc Brevo/Resend/SendGrid).

### Lưu ý dev

- Nút TanStack Query devtools (dev-only, hình cây dừa) nằm cùng góc nút chat — chỉ có ở `yarn dev`, production không có.
- Nút X của thanh CTA mobile nằm góc TRÁI (góc phải là cột nút chat + liên hệ).

## 12. Cập nhật 2026-07-10 (đợt 2) — Real-time + Persist gen-UI + TTS + Admin 100%

### Sản phẩm chat REAL-TIME 100%

- Admin sửa sản phẩm/danh mục → BE tự bắn webhook resync sang agent (**0.25s** đo thực tế) — chat luôn trả giá/tồn kho mới nhất.
- Lưới an toàn: agent tự đồng bộ lại mỗi 30s (trường hợp sửa DB trực tiếp). Env BE: `AGENT_URL`, `AGENT_RESYNC_SECRET`, `AGENT_ADMIN_SECRET` (be/.env.example).

### Reload không mất gen-UI trong chat

- Carousel/form/bảng so sánh đã hiện trong chat được lưu vào cột `ui_blocks` (SQLite) — F5/mở lại vẫn còn nguyên (trước đây chỉ còn text).

### Nút loa đọc tin nhắn nhanh hơn

- Server cache MP3 (LRU 64, sha256 text) + client cache Blob: lần đầu ~3s (MiniMax sinh audio), nghe lại ~60ms; cùng câu qua reload cũng tức thì.

### Kênh liên hệ nổi — admin tùy chỉnh 100%

- Cài đặt site → Footer → **"Kênh nút liên hệ nổi"**: thêm không giới hạn kênh (Facebook, Zalo, TikTok, YouTube, Instagram, LinkedIn, Telegram, WhatsApp, SĐT, email, link bất kỳ) — mỗi kênh chọn icon (màu thương hiệu tự áp) + nhãn + link, sắp xếp bằng mũi tên. Nhập SĐT tự thành `tel:`, email tự thành `mailto:`.
- Đã publish sẵn 3 kênh MẪU (Facebook/Zalo/TikTok) — **thay link thật trước khi bàn giao**. Xóa hết kênh → widget fallback về Messenger/Zalo/Hotline/Email cũ.

### Trang "Kiến thức AI" trong admin

- Sidebar → Tuỳ chỉnh → **Kiến thức AI**: soạn `knowledge.md` bằng Tiptap WYSIWYG (như soạn bài viết) hoặc chế độ Markdown thô. Bấm Lưu → trợ lý dùng NGAY (đã test: thêm ưu đãi → hỏi chat trả lời đúng sau vài giây).
- Luồng bảo mật: FE → BE proxy `/api/agent/knowledge` (JWT admin) → agent (secret nội bộ) — FE không bao giờ thấy secret.

### Kiểm thử đợt này

- 57 pytest agent PASS, FE production build PASS, tsc + ESLint FE/BE sạch.
- 3 vòng E2E `round-full.sh` PASS 100% liên tiếp; browser test thật: reload giữ carousel, TTS replay 64ms, admin thêm 3 kênh → publish → client hiện đúng (desktop 1854 + mobile 390), console 0 lỗi.

## 13. Cập nhật 2026-07-10 (đợt 3) — UX chat + upload ảnh + tài khoản mặc định

- **Tài khoản admin mặc định đổi thành `admin@vhdcorp.com` / `admin123`** (seed.ts + DB hiện tại đã đổi; mọi script test/tài liệu cập nhật theo).
- **Con lăn chuột trong khung chat**: trước đây lăn chuột trong chat lại cuộn trang phía sau (do thư viện Lenis smooth-scroll hijack wheel toàn trang). Fix: `data-lenis-prevent` trên panel + wheel handler riêng — lăn trong chat chỉ cuộn tin nhắn, trang đứng yên; lăn ngoài chat vẫn bình thường. Đã verify bằng chuột thật (Playwright): panel 0px, ngoài panel cuộn đủ.
- **Upload ảnh trong chat**: nguyên nhân lỗi là giới hạn 4MB (ảnh chụp điện thoại thường vượt) — giờ ảnh tự thu nhỏ về 1280px + nén JPEG trước khi gửi, nhận tới 15MB, chọn lại cùng một file vẫn hoạt động. Đã test end-to-end: đính ảnh → preview → gửi → agent trả kết quả tìm bằng ảnh (8 card sản phẩm).
- **Kênh liên hệ nổi — tải icon riêng**: mỗi kênh có nút tải icon (Cloudinary) thay icon preset; bỏ icon là quay về mặc định. Đã test: upload → Lưu nháp → Xuất bản → client hiển thị icon tùy chỉnh.
- Kiểm thử đợt này: tsc + ESLint sạch, 1 vòng `round-full.sh` PASS 100%, console 0 lỗi.
- `docs/BAO_CAO.md` viết lại toàn diện: kiến trúc 3 tầng + data flow + mô hình dữ liệu + toàn bộ tính năng client/admin/agent.

## 14. Cập nhật 2026-07-11 — Builder hiện layout thật + Users CRUD + tương phản nút ảnh

- **Page Builder mở lên là thấy giao diện trang chủ đang chạy**: trước đây config trong DB chưa có section (trang chủ render từ layout dựng sẵn trong code) nên builder hiện canvas trống. Giờ builder tự nạp đúng layout đang hiển thị (13 section) khi config trống → admin chỉnh/kéo thả ngay; đã Lưu + Xuất bản nên **config là nguồn chân lý** (version 10, home = 13 sections). Kéo-thả verify bằng chuột thật; undo/redo, auto-save 30s, Ctrl+S/Z/Y hoạt động. Trang Giới thiệu/Liên hệ vẫn dùng giao diện dựng sẵn cho tới khi admin thêm section (empty-state ghi chú rõ).
- **Người dùng — CRUD đầy đủ**: thêm tài khoản (email/mật khẩu/vai trò, mặc định STAFF), sửa tên, đặt lại mật khẩu (thu hồi phiên cũ), xóa mềm + Thùng rác khôi phục, tìm theo email. BE mới: `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/password`, `POST /users/:id/restore`, `GET /users?deletedOnly=true` (đều chỉ ADMIN). Đã test 7 case API + trọn luồng browser.
- **Nút Đổi/Xóa trên ảnh (ImageUploader)**: đổi sang nền tối + viền trắng, overlay đậm hơn — nổi rõ trên ảnh sáng màu. Lưu ý: nút vốn hoạt động bình thường; nếu test trong **cửa sổ browser do công cụ tự động (Playwright) mở** thì hộp thoại chọn file bị công cụ chặn — hãy test upload trong browser thường.
- Kiểm thử: tsc + ESLint FE/BE sạch, 7 test API users pass, browser E2E (builder kéo-thả + users + uploader), 1 vòng `round-full.sh` PASS 100%, console 0 lỗi, test data đã dọn.

## 15. Cập nhật 2026-07-11 (đợt 2) — Builder 3 trang + publish tức thì + hộp thư liên hệ

- **Builder hiện layout đang chạy của CẢ 3 trang**: thêm `defaultAboutSections()` (hero, số liệu, sứ mệnh/tầm nhìn/giá trị, hành trình 2014→2030, giá trị cốt lõi, CTA) và `defaultContactSections()` (quy trình 4 bước + FAQ — render TRÊN form liên hệ, form không bị thay). Builder tự seed khi config trống; "Tải layout mẫu" giờ đúng theo trang đang chọn. Đã publish → config là nguồn chân lý cho cả 3 trang (home 13 / about 6 / contact 2 section).
- **Nút nhân bản section** (icon copy) trên mỗi hàng — copy nguyên props, chèn ngay dưới.
- **Publish thấy ngay lập tức**: trước đây `revalidateTag(tag, "default")` là stale-while-revalidate → lượt xem đầu sau publish vẫn là bản cũ (tối đa 60s). Đổi sang `revalidateTag(tag, { expire: 0 })` (hết hạn cứng) — đã đo: publish xong, lượt curl ĐẦU TIÊN đã là nội dung mới.
- **Kiểm chứng admin chỉnh UI thật**: sửa heading CTA trang Giới thiệu trong builder → Lưu → Xuất bản → client hiển thị đúng chuỗi mới, rồi khôi phục.
- **Hộp thư liên hệ**: thêm nút **Trả lời qua email** (mailto điền sẵn "Re: <tiêu đề>" + lời chào). Test trọn luồng thật: khách gửi form (/contact) → 2 email thật (báo admin + xác nhận khách) → hiện trong inbox admin → đánh dấu đã xử lý → xóa. Lưu ý: form yêu cầu đủ Họ tên/Email/Tiêu đề/Nội dung (HTML5 required).
- Kiểm thử: tsc + ESLint sạch, browser E2E toàn bộ (builder 3 trang, kéo-thả, nhân bản, sửa props→publish→client, liên hệ), vòng `round-full.sh` PASS 100%, console 0 lỗi, test data dọn sạch.

## 16. Cập nhật 2026-07-11 (đợt 3) — Builder UX chuyên nghiệp + real-time không cache

### Page Builder UX

- **Click khối trong list → preview tự cuộn tới khối đó + viền sáng highlight**; **click khối ngay trong preview → list chọn theo** (preview là chọn-để-chỉnh kiểu Wix, link trong preview không điều hướng).
- **Thêm/nhân bản khối → preview cuộn xuống khối mới** và chọn sẵn để chỉnh.
- **Panel Thuộc tính viết lại hoàn toàn** (`components/admin/section-props-editor.tsx`): nhãn tiếng Việt cho mọi field, danh sách (chỉ số/bước/FAQ/quote/slide/logo/hàng so sánh) là form từng mục với nút thêm/xóa/lên/xuống — **không còn bắt admin gõ JSON**; field ảnh có nút tải lên Cloudinary ngay cạnh; căn lề/bố cục/vị trí ảnh là dropdown; bật/tắt là Switch.
- **BỎ auto-save 30s** — chỉ Lưu thủ công (nút Lưu / Ctrl+S) hoặc không lưu; thoát khi chưa lưu có cảnh báo beforeunload.

### Real-time — bỏ cache hoàn toàn

- `getSiteConfig` (published), danh sách sản phẩm + bài viết SSR: `cache: "no-store"` — **publish/sửa là mọi lượt xem TIẾP THEO thấy ngay**, không còn cửa sổ 60s, không cần bước revalidate (endpoint `/api/revalidate` vẫn giữ, vô hại). Đã đo: publish xong curl ngay lập tức ra bản mới.

### Kiểm thử

- tsc + ESLint sạch; browser E2E: click list↔preview 2 chiều, highlight, thêm khối cuộn tới, sửa form panel → preview đổi live; vòng `round-full.sh` PASS 100%; console 0 lỗi.

## 17. Cập nhật 2026-07-11 (đợt 4) — Builder phủ 100% trang + UX site

- **Page Builder giờ phủ TẤT CẢ trang nội dung (5 trang)**: Trang chủ, Giới thiệu, Liên hệ, **Sản phẩm**, **Tin tức**. Với 2 trang danh sách, section hiển thị **phía trên danh sách** (banner khuyến mãi/CTA — danh sách sản phẩm/bài viết giữ nguyên bên dưới); layout mẫu riêng cho từng trang. Đã publish sẵn banner "Nhận báo giá B2B" mẫu trên trang Sản phẩm — sửa/xóa tùy ý trong builder.
- Các trang còn lại đều đã config được từ trước: header/nav/footer/theme/brand (Cài đặt site), sản phẩm & bài viết & danh mục & banner (CRUD + SEO riêng từng trang), kênh liên hệ nổi, kiến thức AI → **admin config 100% mọi thứ khách nhìn thấy**.
- **UX site**: thêm `app/(client)/loading.tsx` (spinner brand khi chuyển trang — cần thiết vì site giờ render real-time không cache) + `app/(client)/error.tsx` (màn hình lỗi brand + nút Thử lại/Về trang chủ thay vì trắng trang). 404 đã có từ trước.
- Script test: các check nội dung chat gộp SSE delta trước khi so khớp (số có thể bị cắt giữa 2 chunk stream — hết flake).
- Kiểm thử: tsc + ESLint sạch, builder 5 trang E2E (chọn trang → tải mẫu → Lưu → Xuất bản → client hiện ngay), 2 vòng `round-full.sh` PASS 100% liên tiếp, console 0 lỗi.
