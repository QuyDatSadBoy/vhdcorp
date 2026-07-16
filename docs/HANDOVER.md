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
| **Email**     | `vhdcorp.contact@gmail.com`       |
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

> Đăng nhập bằng `vhdcorp.contact@gmail.com` / `admin123` tại `/admin/login`.

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

- [ ] `/admin/login` đăng nhập bằng `vhdcorp.contact@gmail.com` / `admin123` → vào `/admin/dashboard`
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
- **Đổi mật khẩu admin sau bàn giao:** Vào `/admin/users` → tìm `vhdcorp.contact@gmail.com` → đặt lại mật khẩu, hoặc tạo tài khoản admin mới rồi xóa tài khoản seed
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

**Đã gửi THẬT qua Gmail SMTP** (`vhdcorp.contact@gmail.com`, app-password trong `be/.env`) — mỗi liên hệ gửi 2 email: báo admin + xác nhận cho khách (template HTML brand + plain-text + header chống spam). Log `Đã gửi email tới ...` trong be log.
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

- **Tài khoản admin mặc định đổi thành `vhdcorp.contact@gmail.com` / `admin123`** (seed.ts + DB hiện tại đã đổi; mọi script test/tài liệu cập nhật theo).
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

## 18. Cập nhật 2026-07-12 — Lỗi tiếng Việt 100% + khối nhúng + fix DB reboot

- **Fix đăng nhập 500**: nguyên nhân là container PostgreSQL (`vhdcorp-postgres`) không tự chạy lại sau khi reboot máy. Đã start + đặt `--restart unless-stopped` (tự chạy cùng Docker từ nay). Lỗi DB-down giờ trả **503 tiếng Việt** ("Không kết nối được cơ sở dữ liệu…") thay vì 500 Internal server error.
- **Thông báo lỗi 100% tiếng Việt** (3 tầng):
  - `AllExceptionsFilter` (mới): bắt mọi lỗi bất ngờ/DB sập → thông báo Việt + log stack đầy đủ.
  - `HttpExceptionFilter`: dịch toàn bộ default tiếng Anh của Nest (Unauthorized/Forbidden/Too Many Requests/"Cannot GET /x"…).
  - `ValidationPipe`: dịch mẫu class-validator mặc định ("must be an email" → "phải là email hợp lệ", min/max ký tự…).
- **Footer nhúng chuyên nghiệp — admin chỉ dán link** (Cài đặt site → Footer):
  - **Google Maps**: dán bất kỳ — mã `<iframe>`, link, hay CHỈ CẦN GÕ ĐỊA CHỈ → tự chuyển thành bản đồ nhúng (hiện khi bật "Hiện bản đồ"). Đang cấu hình mẫu "Hồ Gươm, Hoàn Kiếm, Hà Nội" — thay bằng địa chỉ thật.
  - **Fanpage Facebook**: dán link fanpage → nhúng Page Plugin (đang mẫu facebook.com/facebook — thay bằng fanpage thật).
- **4 khối UI mới trong Page Builder** (tổng 21 khối): **Bản đồ Google** (dán iframe/link/địa chỉ), **Video** (YouTube/TikTok/Facebook/Vimeo — dán link tự nhận diện), **Fanpage Facebook** (Page Plugin), **Banner ảnh** (ảnh + link). Util chuẩn hóa link: `fe/lib/embeds.ts`.
- **Script nghiệm thu chuyển vào repo**: `scripts/round-full.sh` (trước ở thư mục tạm, mất khi reboot) — chạy `bash scripts/round-full.sh`, exit 0 = PASS.
- Kiểm thử: tsc + ESLint sạch; lỗi 401/validation/404/DB-down đều tiếng Việt (curl verify); footer render bản đồ Hồ Gươm + fanpage thật trên client; 4 khối mới hiện trong builder + khối bản đồ render ngay trong preview; vòng nghiệm thu PASS 100%.

## 19. Cập nhật 2026-07-12 (đợt 2) — Email mới + Builder preview = client 100%

- **Email đổi sang `vhdcorp.contact@gmail.com`** (SMTP gửi + IMAP agent đọc — đã test cả hai TRƯỚC khi thay). Thay toàn bộ: `be/.env` (SMTP*USER/PASS/MAIL_FROM/ADMIN_EMAIL), `agent/.env` (GMAIL_IMAP*\*), script nghiệm thu, docs. Đã verify: khách gửi form → 2 email (báo admin + xác nhận khách) đều đi từ tài khoản mới; agent đọc đúng inbox mới.
- **Builder preview GIỐNG HỆT client**: trước đây trang Sản phẩm/Tin tức/Liên hệ hiện "Canvas đang trống" dù ngoài client có giao diện đầy đủ. Giờ preview render **đúng component thật của client** bên dưới sections: danh sách sản phẩm thật (8 card), danh sách bài viết thật, form liên hệ thật — cùng một config (draft đang chỉnh được đồng bộ vào store nên form/thông tin trong preview cũng ăn theo config nháp). Không còn trang nào trống trong builder.
- **Fix mất section trang Sản phẩm/Tin tức khi Lưu**: builder cũ chỉ ghi 3 trang đầu vào draft nên lần Lưu nào cũng xóa mất sections của products/posts (CTA "Nhận báo giá B2B" từng publish đã bị mất vì vậy). Hydrate giờ giữ đủ 5 trang; đã khôi phục + publish lại CTA mẫu trang Sản phẩm.
- Kiểm thử: tsc + ESLint sạch; browser verify preview Sản phẩm (8 card thật + hint bar) và Liên hệ (Quy trình + FAQ + form thật); email 2 chiều tài khoản mới; vòng `scripts/round-full.sh` PASS 100%; test data dọn sạch.

## 20. Cập nhật 2026-07-12 (đợt 3) — Root admin, OTP email, gửi mail hàng loạt, tracking & recommendation

### 3 vai trò (roles) trong hệ thống

| Role                                          | Quyền                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CUSTOMER**                                  | Khách hàng: đăng ký/đăng nhập (bắt buộc xác minh email), xem sản phẩm, viết đánh giá, gửi liên hệ, chat AI, quản lý hồ sơ cá nhân                                                                |
| **STAFF**                                     | Nhân viên: mọi quyền CUSTOMER + vào trang admin quản lý NỘI DUNG (sản phẩm, danh mục, bài viết, banner, media, đánh giá, liên hệ, xem danh sách người dùng, builder, cài đặt site, kiến thức AI) |
| **ADMIN**                                     | Quản trị: mọi quyền STAFF + quản lý NGƯỜI DÙNG (tạo/xóa/đổi role/reset mật khẩu), gửi email hàng loạt, xuất báo cáo                                                                              |
| **ROOT** (cờ `isRoot` trên 1 tài khoản ADMIN) | `vhdcorp.contact@gmail.com` — TỐI CAO: không ai (kể cả ADMIN khác) xóa/đổi role/reset mật khẩu được; hiện badge ROOT trong admin; chỉ tự đổi mật khẩu bằng mật khẩu cũ (`/users/me/password`)    |

### Xác minh email + Quên mật khẩu (OTP qua Gmail thật)

- **Đăng ký**: tạo tài khoản → gửi mã OTP 6 số về email → user nhập mã tại `/verify-email` mới đăng nhập được (login trước xác minh trả 403 tiếng Việt). Đăng ký bằng Google được miễn xác minh (Google đã xác thực email). Tài khoản do admin tạo cũng auto-verified.
- **Quên mật khẩu** (`/forgot-password`, link ngay trang đăng nhập): nhập email → nhận mã OTP → nhập mã + mật khẩu mới → đặt lại + đăng xuất mọi phiên cũ. Response luôn chung chung (không lộ email tồn tại), mã hash bcrypt + hạn 10 phút, throttle 3 lần/phút.
- Endpoint: `POST /auth/verify-email | resend-verification | forgot-password | reset-password`. Email OTP dùng template brand (mã to, hạn 10').
- Đã test trọn vòng với Gmail THẬT: mã về inbox → verify 200 → login OK; quên mật khẩu → reset → mật khẩu cũ 401.

### Gửi email hàng loạt từ trang Người dùng

- Chọn 1/nhiều user bằng checkbox (không chọn = gửi TẤT CẢ, tối đa 200/lần) → nút "Gửi email" mở dialog: **thư viện template** (chào mừng, khuyến mãi, cảm ơn, bảo trì, sản phẩm mới, trống) load 1 chạm rồi sửa; biến `{{name}}`/`{{email}}` thay riêng từng người nhận; nội dung bọc trong khung email brand VHD. BE: `POST /users/send-mail` (chỉ ADMIN), trả `{sent, failed, total}`.

### Tracking + Recommendation + Báo cáo

- **Bảng `view_events`**: khách mở trang chi tiết sản phẩm ≥2 giây → ghi 1 lượt xem (sessionId ẩn danh trong localStorage; dedupe 30 phút/khách/sản phẩm; throttle 60/phút).
- **Recommendation "khách xem X cũng xem Y"**: co-view collaborative filtering bằng SQL thuần (nhẹ, không cần model ML), fallback sản phẩm cùng danh mục khi thiếu dữ liệu — `GET /products/:id/recommendations`; mục "Sản phẩm liên quan" ở trang chi tiết đã dùng nguồn này.
- **Dashboard admin**: chart lượt xem 30 ngày (tracking thật) + Top sản phẩm được xem + 4 nút **xuất báo cáo CSV** (lượt xem / top SP / liên hệ / sản phẩm — UTF-8 BOM mở Excel chuẩn tiếng Việt). Endpoint: `GET /statistics/views | top-viewed | export?type=…`.

### Kiểm thử đợt này

- Root: admin phụ thử xóa/đổi role/reset mật khẩu root → 403 cả 3; root đổi mật khẩu sai mật khẩu cũ → 401.
- OTP: 2 vòng email thật (verify + reset). Bulk mail: gửi thật, biến {{name}} thay đúng.
- Tracking: dedupe hoạt động, co-view đứng đầu recommendations, CSV thuần chuẩn.
- tsc + ESLint FE/BE sạch; browser smoke các trang mới; vòng `scripts/round-full.sh` PASS 100%; test data dọn sạch.

## 21. Cập nhật 2026-07-13 — Đồng bộ config 100% + UX chỉ dẫn + email logo + PDF + profile admin

- **Dải cam kết footer** ("Cam kết chất lượng / Giao toàn quốc / Hỗ trợ 7 ngày / 12+ năm uy tín") — trước hardcode trong code, giờ **config 100%** tại Cài đặt site → Footer → "Dải cam kết": sửa nội dung, đổi icon (8 icon), thêm/xóa ô. Preview builder có header+footer nên thấy ngay.
- **Nút trợ lý AI có chỉ dẫn**: bong bóng chào lần đầu ("👋 Tôi là trợ lý AI… hỏi giá, tìm bằng ảnh, đặt hàng") tự hiện sau 1.5s, bấm là mở chat, nhớ trạng thái đã xem; nhãn "Trợ lý AI" luôn hiện cạnh nút (desktop). **Nút liên hệ nhanh**: đổi icon dấu cộng → icon điện thoại + nhãn "Liên hệ nhanh" — user biết ngay để làm gì.
- **Form liên hệ: SĐT bắt buộc** (FE + BE validate tiếng Việt); tool AI cũng được dạy hỏi xin SĐT trước khi gửi liên hệ. Script nghiệm thu cập nhật theo.
- **Email chuyên nghiệp**: header mọi email giờ có **logo VHD thật** (env `MAIL_LOGO_URL` — đã trỏ tới Cloudinary). **Trình soạn email hàng loạt viết lại cho non-tech**: soạn bằng Tiptap WYSIWYG (như Word) + **khung xem trước email trực tiếp** (đúng header brand + logo, biến {{name}} thay mẫu) song song 2 cột.
- **Xuất báo cáo PDF**: nút "🖨 Báo cáo PDF" trên Dashboard — mở báo cáo brand (logo + tổng lượt xem + 2 bảng số liệu) và hộp thoại in → Save as PDF; tiếng Việt chuẩn 100%, không cần thư viện ngoài. CSV vẫn có 4 loại.
- **Trang Thông tin cá nhân admin** (`/admin/profile` — bấm vào tên ở đáy sidebar): sửa tên + ảnh đại diện, **đổi email đăng nhập** (xác nhận bằng mật khẩu hiện tại), **đổi mật khẩu (luôn cần mật khẩu cũ — kể cả root)**. Quy tắc mật khẩu: tự đổi → cần mật khẩu cũ; admin reset cho CẤP DƯỚI (trang Người dùng) → không cần; KHÔNG AI reset được mật khẩu root.
- **Người dùng**: bộ lọc vai trò (Tất cả / Khách hàng / Nhân viên / Quản trị); KPI "Người dùng" trên Dashboard giờ chỉ đếm **khách hàng** (CUSTOMER), không tính admin/staff.
- Kiểm thử: browser smoke toàn bộ UI mới PASS; contact thiếu SĐT → 400 tiếng Việt; đổi email sai mật khẩu → 401; mail logo gửi thật; vòng `scripts/round-full.sh` PASS 100%; test data dọn sạch.

## 22. Cập nhật 2026-07-13 (đợt 2) — Header/Footer trong Builder + thuộc tính đầy đủ 100%

- **Header + Footer giờ chỉnh được NGAY TRONG Builder**: mục "Toàn site (mọi trang)" cuối danh sách section có 2 hàng "Header + thanh promo" và "Footer (cam kết, bản đồ, fanpage…)" — click (hoặc click thẳng vào header/footer trong preview) → highlight + panel Thuộc tính chỉnh: mô tả công ty, copyright, bật/tắt bản đồ, link Maps, fanpage (footer); thanh promo (header). Sửa là preview đổi live, Lưu/Xuất bản như section thường. Phần nâng cao (dải cam kết, cột link, kênh nổi) có link thẳng sang Cài đặt site.
- **Thuộc tính đầy đủ 100% = những gì đang hiển thị**: trước đây nhiều khối (Đối tác, Lĩnh vực, Use Cases, Quy trình, FAQ, Bảng so sánh) hiển thị nội dung mặc định hardcode trong component nhưng panel thuộc tính TRỐNG (props rỗng) — không sửa được. Giờ nội dung mặc định được **export từ component và seed thẳng vào props** layout mẫu: chọn "Đối tác" là thấy đủ 6 mục logo để sửa/xóa/thêm, FAQ đủ câu hỏi, Quy trình đủ bước… Một nguồn nội dung duy nhất — không còn lệch giữa hiển thị và thuộc tính.
- **Đối tác chưa có ảnh logo** → render card chữ tên thương hiệu (admin điền ảnh sau, có nút tải ảnh ngay trong panel).
- **Nút "Nạp lại layout mẫu"** giờ luôn hiện (trước chỉ hiện khi canvas trống) — nạp lại layout chuẩn bất cứ lúc nào.
- Đã nạp lại + publish layout trang chủ với props đầy đủ (13 section, mọi nội dung nằm trong config).
- Kiểm thử: panel Đối tác 6 mục, hàng Footer + highlight + panel hoạt động, client render nguyên vẹn (hero/đối tác/lĩnh vực/FAQ), vòng `scripts/round-full.sh` PASS 100%, console 0 lỗi.

## 23. Cập nhật 2026-07-13 (đợt 3) — Root email mới, chống spam email, chat tự mở, Banner nối site, parity tuyệt đối

### Tài khoản & thống kê

- **Root admin đổi thành `vhdcorp.contact@gmail.com`** (mật khẩu admin123 — đổi ngay sau bàn giao). Cập nhật đồng bộ DB + seed + script nghiệm thu + docs. Mọi bảo vệ root giữ nguyên (không ai xóa/đổi role/reset được).
- **KPI Dashboard "Khách hàng"**: chỉ đếm role CUSTOMER (trước đếm cả admin/staff nên ra 2). Trang Người dùng mặc định lọc sẵn "Khách hàng".
- **Avatar sidebar**: chip user ở đáy sidebar hiển thị ảnh đại diện thật (trước chỉ hiện chữ cái đầu nên "đổi ảnh mà icon không đổi").

### Email — hết kẹt `{{…}}` + chống vào thư rác

- **Lỗi `{{Trần Quý Đạt}}`**: khi người soạn sửa chữ bên trong biến `{{name}}` làm biến hỏng, hệ thống tự **gỡ ngoặc, giữ phần chữ** (regex stripLeftover chạy sau khi thay {{name}}/{{email}}). Không bao giờ còn `{{ }}` trong mail gửi đi.
- **Nội dung Tiptap được bọc style chuẩn** (`.vhd-body`: h1/h2 màu brand, khoảng cách đoạn…) vì Tiptap xuất HTML không kèm style.
- **Chống spam**: mail kèm bản plain-text song song, header `List-Unsubscribe`, `Reply-To`, logo + **địa chỉ công ty ở footer** (env `MAIL_COMPANY_ADDRESS`). Đã test thật: mail bulk vào **INBOX** Gmail. ⚠️ Muốn triệt để 100% khi gửi số lượng lớn: cần domain riêng + SPF/DKIM/DMARC (Gmail cá nhân không cấu hình được) — ghi rõ để khách nâng cấp sau.

### Trợ lý AI

- **Nút chat mới**: vòng conic 3 màu brand (vàng→xanh→đỏ) + **mascot robot** (`fe/public/images/ai-agent.png` — đã có sẵn mascot vẽ theo brand; thay file này bằng ảnh mascot riêng nếu muốn, thiếu file sẽ tự fallback icon robot).
- **Tự mở lần đầu**: khách vào web lần đầu trên desktop → panel chat **tự mở sau 2.5s** kèm 6 câu hỏi mẫu (đơn tối thiểu, OEM, giao hàng, chứng nhận, công nợ, xuất khẩu) — bấm là hỏi ngay. Mobile giữ bong bóng chào (không che màn hình). Chỉ 1 lần (localStorage).

### Page Builder — parity tuyệt đối client ↔ preview

- **Hàng "Khối cố định của trang"**: trang Sản phẩm/Tin tức/Liên hệ có hàng đại diện "📦 Danh sách sản phẩm / 📰 Danh sách bài viết / 📋 Form liên hệ (cố định)" trong danh sách section — click là preview cuộn tới khối; ghi rõ dữ liệu lấy từ module nào. Hết cảnh "preview có khối mà danh sách không có".
- **Trang Giới thiệu bỏ fallback tĩnh hardcode**: khi 0 section, client giờ render `defaultAboutSections()` — cùng nguồn với nút "Tải layout mẫu" trong builder (giống cơ chế trang chủ). Preview builder khi 0 section cũng render đúng layout mẫu đó kèm note + nút nạp. Client và preview không thể lệch nhau ở bất cứ trạng thái nào.
- **Cài đặt site đã soát đủ 100%** so với schema config: brand (5), theme (màu/chữ/spacing/radius), SEO (7), header, navigation, footer (copyright, mô tả, dải cam kết, bản đồ, fanpage, liên hệ + kênh nổi tùy chỉnh, social, cột link), custom CSS, lịch sử phiên bản.

### Banner — nối vào site (trước đây tạo banner không hiện ở đâu)

- Section **"Banner slider"** trong builder có thuộc tính mới **"Nguồn slide"**: "Tự nhập slide" (như cũ) hoặc **"Lấy từ trang Quản trị → Banner"** + ô "Vị trí banner" (mặc định `home-hero`). Chọn nguồn Banner → slider tự hiển thị các banner đang bật ở vị trí đó, đổi banner hằng ngày không cần đụng layout. Đã test end-to-end: tạo banner → hiện trong preview builder → xóa banner test.

### Thư viện ảnh trùng

- 4 ảnh logo giống nhau trong Thư viện ảnh là do các lần test upload avatar/logo (mỗi lần tải lên lưu 1 bản). Chỉ ảnh avatar hiện tại của root đang được dùng — 3 bản còn lại xóa an toàn bằng nút thùng rác trên từng ảnh (id 5, 6, 7).

### Kiểm thử đợt này

- IMAP đọc mail bulk thật: vào INBOX, đủ List-Unsubscribe/Reply-To/plain-text/logo, biến thay đúng, không còn `{{}}`.
- Browser: chat tự mở + câu hỏi mẫu, FAB mascot 0 lỗi console, KPI "KHÁCH HÀNG 1", users lọc CUSTOMER, 4 hàng khối cố định + toàn site trong builder, /about nguyên vẹn sau refactor, banner slider nguồn Banner hiện đúng ảnh trong preview.
- tsc + ESLint FE sạch; vòng `scripts/round-full.sh` PASS 100% (×2); banner + mail test đã dọn.

## 24. Cập nhật 2026-07-15 — Khối cố định config 100%, agent phủ đủ web + đọc DB trực tiếp

### Page Builder — "chỗ nào cũng config được"

- **Khối cố định giờ CÓ thuộc tính** (trước bấm vào không thấy gì): click hàng "Form liên hệ / Danh sách sản phẩm / Danh sách bài viết (cố định)" (hoặc click thẳng vào khối trong preview — có highlight viền) → panel Thuộc tính hiện: eyebrow + tiêu đề lớn + mô tả (mọi trang), riêng Liên hệ thêm tiêu đề/mô tả cột thông tin + form. Sửa là preview đổi live, Lưu/Xuất bản như thường; để trống ô nào dùng nội dung mặc định. Lưu ở `config.fixedBlocks.{contact|products|posts}` — client đọc cùng store nên đồng bộ tuyệt đối. Hero "Cùng nhau xây dựng giá trị bền vững", "Tin tức & Bài viết", "Sản phẩm VHD Corp"… đều sửa được từ đây.
- **Chip thương hiệu sidebar admin** dùng logo thật từ Cài đặt site → Brand (fallback chữ V khi chưa có logo).

### Agent — phủ đủ 100% module web, data TRỰC TIẾP từ DB

- **Đọc trực tiếp PostgreSQL** (env `CATALOG_DATABASE_URL` trong `agent/.env`, pool asyncpg read-only, module `agent/app/db/catalog.py`): sản phẩm, bài viết, danh mục, gợi ý co-view (bảng `view_events`), thông tin công ty (site config PUBLISHED). DB lỗi → tự fallback `data/products.json` (vẫn được webhook đồng bộ) — chat không bao giờ vỡ.
- **4 tool mới** (`agent/app/tools/site.py`): `search_posts` (tin tức → thẻ bài viết bấm được), `list_categories` (chip danh mục + số SP), `get_recommendations` ("khách xem X cũng xem Y" từ tracking thật → carousel), `get_company_info` (địa chỉ/hotline/social chính thức từ config — không bịa). Persona đã dạy model khi nào dùng tool nào. Tổng: **15 tools**.
- **2 gen-UI component mới** phía FE: `post-list` (thẻ bài viết có cover/icon + link), `category-list` (chip danh mục bấm là mở trang lọc sẵn). Registry: `fe/components/chat/gen-ui/gen-ui-block.tsx`.
- Về câu hỏi CopilotKit/AG-UI/A2UI: dự án dùng **giao thức AG-UI-style tự viết** (SSE `ui` event {component, props} + registry FE + form gen-UI gửi ngược HITL) — cùng năng lực với CopilotKit nhưng không thêm dependency nặng; A2A card + MCP server đã có sẵn cho agent-to-agent.

### Kiểm thử đợt này

- Agent: pytest **57/57 PASS** (5 test tool chuyển sang `ainvoke` vì tool giờ async đọc DB); chat thật: tin tức → post-list, danh mục → category-list, gợi ý → carousel co-view, công ty → đúng config; giá đọc trực tiếp DB.
- Builder: panel khối cố định hiện đủ trường, sửa tiêu đề → preview đổi live ngay, highlight viền xanh, Ctrl+Z hoàn tác sạch; logo sidebar hiện đúng.
- Vòng `scripts/round-full.sh` PASS 100%; tsc FE/BE + ESLint sạch; hội thoại test đã dọn.

## 25. Cập nhật 2026-07-15 (đợt 2) — E-COMMERCE: giỏ hàng, đơn hàng, voucher, giá KM, search thông minh

### Mua sắm kiểu Shopee (KHÔNG thanh toán online)

- **Giỏ hàng**: store zustand + localStorage (`vhd_cart`); nút "Thêm vào giỏ" (card + trang chi tiết kèm chọn số lượng); icon giỏ + badge số lượng trên header; trang `/cart` đầy đủ (sửa số lượng, xóa, voucher, form nhận hàng, tổng tiền).
- **Đặt hàng**: `POST /orders` (public, throttle 5/phút) — giá + giảm giá **tính lại hoàn toàn server-side** từ DB (không tin client), kiểm tồn kho, voucher trừ lượt atomic trong transaction; mã đơn `VHD-xxxx`; 2 email tự bay (admin qua `ADMIN_EMAIL` + xác nhận cho khách, template brand có bảng sản phẩm). Models: `Order` + `OrderItem` (snapshot tên/giá), enum trạng thái PENDING→CONFIRMED→SHIPPING→DONE/CANCELLED.
- **Admin → Đơn hàng**: lọc theo trạng thái, chi tiết từng đơn, chuyển trạng thái; KPI "Đơn chờ xác nhận" trên Dashboard.
- **Khách theo dõi đơn**: đặt khi đăng nhập → đơn gắn userId (decode cookie best-effort trên route public) → xem tại Tài khoản → "Đơn hàng của tôi".

### Voucher (Admin → Voucher)

- Model `Voucher`: mã, PERCENT/FIXED, đơn tối thiểu, maxUses/usedCount, startsAt/endsAt, active. CRUD admin + `POST /vouchers/validate` (public — khách nhập mã ở giỏ). Mọi lỗi tiếng Việt: hết hạn/hết lượt/chưa đến ngày/chưa đạt đơn tối thiểu.

### Giá khuyến mãi (Product.salePrice + saleEndsAt)

- Form sản phẩm admin có 2 ô mới; client hiện **giá đỏ + giá gốc gạch + badge -x% + "KM đến dd/mm"** (component `PriceTag`) ở mọi nơi (card nổi bật, listing, chi tiết, giỏ, suggest, chat AI). Giá hiệu lực dùng chung helper `effectivePrice` (FE + BE + agent) — hết hạn KM tự quay về giá gốc.
- **Agent báo giá đúng giá KM** (đọc DB trực tiếp): "Giá KHUYẾN MÃI: 19.000đ (giá gốc 65.000đ)"; gen-UI card có giá gạch (`originalPrice`).

### Search gợi ý thông minh + recommend rộng

- `GET /products/suggest?q=` — fuzzy **không dấu** (Postgres `unaccent`), top 6 kèm ảnh + giá KM. FE `SmartSearch` trên header (desktop, debounce 250ms, dropdown bấm-là-mở-SP, Enter ra `/search`).
- **"Đã xem gần đây"** (localStorage, 8 SP) hiện ở trang chi tiết; **"Có thể bạn cũng thích"** (co-view) trong giỏ hàng.
- **Khuyến khích đăng nhập**: banner ở giỏ (tự điền + theo dõi đơn) + CTA đăng ký sau đặt đơn (khách vãng lai); đăng nhập rồi thì tự điền tên/email.

### Kiểm thử & lưu ý

- E2E browser thật: thêm giỏ (badge 2) → voucher bị chặn đúng khi chưa đạt đơn tối thiểu → tăng SL → giảm 5.700 → đặt đơn 51.300đ → giỏ tự xóa → admin thấy đơn, đổi trạng thái thành công; SmartSearch "ong nhua" → mở đúng SP; strip Đã xem gần đây + hạn KM hiện đúng. pytest 57/57; `round-full.sh` PASS.
- **Demo data đang để lại cho khách xem**: voucher `TESTGIAM10` (10%, đơn ≥50k, 5 lượt), giá KM 19.000đ cho "Túi vải canvas", 2 đơn hàng test — xóa/sửa trong admin khi hết cần.
- Docs mới: **`docs/TINH_NANG.md`** — tổng quan toàn hệ thống (kiến trúc + tính năng khách/admin/agent) đọc một lần hiểu hết.

## 26. Cập nhật 2026-07-15 (đợt 3) — Agentic actions full power + SEO/tốc độ + HOÀN HẢO ×2

### Agent full power (chuẩn CopilotKit-style)

- **Agent THAO TÁC WEB thật — `add_to_cart`** (tool thứ 16): khách chat "thêm 2 cái sản phẩm này vào giỏ" → agent thêm vào giỏ hàng thật (gen-UI `add-to-cart` → cart store), thẻ xác nhận + nút "Xem giỏ hàng"; **idempotent theo `action_id`** — reload trang không thêm trùng (verified badge giữ nguyên).
- **Context trang hiện tại**: FE gửi `page` (pathname) kèm mỗi message → agent hiểu "sản phẩm này/trang này" (đã test: đứng ở trang Nón lá, nói "thêm 2 cái sản phẩm này" → thêm đúng Nón lá ×2).
- **Follow-up chips thông minh**: sau mỗi câu trả lời, gợi ý 2-3 câu hỏi tiếp theo theo loại gen-UI vừa hiện (carousel → "So sánh…/Thêm vào giỏ/Có KM không?"; add-to-cart → "Đặt hàng ngay"…) — bấm là hỏi luôn.
- **Fix bug thật (short-term memory)**: hội thoại dài có tool-call bị Gemini 400 `INVALID_ARGUMENT` (cửa sổ trượt cắt gãy cặp function-call). Fix: cửa sổ luôn bắt đầu bằng HumanMessage (`memory/short_term.py`); test cập nhật — pytest **57/57**.
- Tên trợ lý lấy từ Cài đặt site → Brand (đổi tên site là widget đổi theo).

### SEO + tốc độ + production

- JSON-LD Product: `offers.price` = **giá KM khi còn hạn** + `priceValidUntil` — Google hiện đúng giá bán/khung giảm giá. (Sẵn có: metadata template, OG, sitemap, robots, aggregateRating từ review thật.)
- **Production build cả 2 tầng PASS**: `nest build` OK; `next build` **0 lỗi 0 cảnh báo** (đã khôi phục dev server sau build — xem pitfall .next trong README).
- CSV thứ 5 trên Dashboard: **Đơn hàng.csv** (mã đơn, khách, items, giảm giá, tổng, trạng thái).
- Nút thêm-giỏ nhanh (icon) trên card danh sách sản phẩm — mua không cần vào trang chi tiết.

### Chuẩn "hoàn hảo ×2"

- `scripts/round-full.sh` PASS **2 lần liên tiếp** (ROUND_RESULT=0 ×2) + pytest 57/57 + tsc/ESLint FE-BE sạch + browser smoke sau rebuild (search/cart/quick-add/CSV) 0 lỗi console.
- Ghi chú phạm vi config: 100% nội dung marketing (section, hero khối cố định, header/footer, brand, ảnh) admin sửa được; microcopy chức năng (nhãn nút "Thêm vào giỏ", chữ trong form…) là text hệ thống — cố tình không đưa vào config để tránh vỡ UX.

## 27. Cập nhật 2026-07-16 — Phiên kép admin/khách, phân quyền media, lỗi 100% tiếng Việt, hồ sơ giao hàng

### Phiên KÉP admin + khách trong cùng trình duyệt (fix "2 tab đè nhau")

- **Nguyên nhân cũ**: 2 tab dùng chung 1 bộ cookie → đăng nhập khách đè phiên admin, đăng xuất 1 tab văng cả 2, refresh-token xoay vòng gây 401 loạn.
- **Fix**: phiên admin dùng bộ cookie riêng (`admin_access_token`/`admin_refresh_token`); FE tự gắn header `X-Session-Scope: admin|client` theo trang đang mở; guard/refresh/logout đọc-ghi đúng bộ cookie theo scope; cache user (zustand persist) tách khóa `vhd-auth-admin`/`vhd-auth`. **Đã test 2 tab thật**: admin và khách sống song song, đăng xuất khách không ảnh hưởng admin.
- CORS thêm `X-Session-Scope` vào allowedHeaders.

### Phân quyền media (fix "khách upload thấy trong thư viện admin")

- POST /media/upload: khách CHỈ được upload avatar (folder ép `avatars`) và **không ghi vào bảng media** — Thư viện ảnh admin chỉ chứa ảnh do admin/staff tải (option `persistToLibrary`). Đã test: khách cố folder khác vẫn bị ép `avatars`, bảng media không tăng.
- Avatar khách giờ **lưu bền vững** (PUT /users/me hoạt động đúng scope, reload không mất).

### Lỗi 100% tiếng Việt phía FE

- `lib/axios.ts` chuẩn hóa mọi lỗi tại một chỗ: ưu tiên message BE (đã tiếng Việt), thiếu thì dịch theo status (401 "Bạn cần đăng nhập…", 403, 404, 429, 500, lỗi mạng…). Hết cảnh "Request failed with status code 401".

### Đặt hàng bắt buộc đăng nhập + hồ sơ giao hàng

- **Thêm giỏ tự do, ĐẶT HÀNG cần đăng nhập**: BE `POST /orders` gắn JwtAuthGuard (401 tiếng Việt); FE giỏ hàng hiện nút "Đăng nhập để đặt hàng" cho khách vãng lai; đơn luôn gắn userId → khách theo dõi ở "Đơn hàng của tôi".
- **User thêm `phone` + `address`** (migration `user_phone_address`): sửa ở Tài khoản → Hồ sơ; giỏ hàng **tự điền đủ 4 trường** (tên/email/SĐT/địa chỉ) từ hồ sơ — đặt đơn vài giây.
- Mail đơn hàng: admin nhận qua **`ADMIN_EMAIL` trong `be/.env`** (đổi người nhận = sửa env, không đụng code) + mail xác nhận cho khách.

### Google OAuth

- Fix nút Google ở login/register dùng sai biến env (`NEXT_PUBLIC_API_BASE_URL` không tồn tại → 404 `/api/auth/google` trên FE) → dùng `NEXT_PUBLIC_API_URL`. BE đã có đủ flow (redirect + callback + idToken). **Cần điền `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` trong `be/.env`** (đang trống) — tạo tại Google Cloud Console, redirect URI: `http://localhost:8080/api/auth/google/callback`.

### UI/UX

- **Chart lượt xem Dashboard** hết "khối tím đặc": FE tự dựng đủ chuỗi 30 ngày (ngày trống = cột mờ 4%), nhãn ngày đầu/cuối + đỉnh lượt/ngày.
- **Ô tìm kiếm header**: placeholder ngắn gọn không bị che, style focus ring brand.
- **404 + trang lỗi runtime mới** theo tone 3 màu logo (số 404 gradient xanh→vàng→đỏ, logo + 3 nút thoát); khu Tài khoản giờ có Header/Footer thật (luôn về được trang chủ).
- **Card sản phẩm trong chat cao bằng nhau** (tiêu đề 2 dòng cố định + khoang giá 2 dòng); click "Xem chi tiết" trong chat đã verify mở đúng trang SP (lỗi trước đó do BE đang lỗi compile giữa phiên dev).
- **Voice**: STT vốn đã realtime (interim results — chữ hiện khi đang nói; tốc độ engine do Google/trình duyệt); TTS thêm **prefetch khi hover nút loa** (bấm là phát ngay) + cache theo text + timeout 15s.

### Kiểm thử

- API: phiên kép (2 scope cùng cookie jar) ✓, avatar khách không vào media ✓, phone/address lưu + /auth/me trả đủ ✓, đặt đơn không login → 401 VN ✓, đơn có login → mail admin+khách + userId ✓.
- Browser: 2 tab admin+khách song song ✓, giỏ tự điền 4 trường ✓, guest thấy "Đăng nhập để đặt hàng" ✓, chart đẹp ✓, 404 mới ✓, account có header ✓, 11/11 case gen-UI chat ✓, click link chat ra đúng SP ✓.
- `round-full.sh` PASS; tsc + ESLint FE/BE sạch.

### Bổ sung 16/07 — Ảnh config 100% + mail đơn hàng

- **Mọi ảnh trên UI đều config được**: Hero trang chủ có `bgImage` (đã sẵn); **khối cố định (Sản phẩm/Tin tức/Liên hệ) thêm "Ảnh nền hero"** (uploader trong Builder, có overlay tối tự động cho chữ dễ đọc); **Icon Trợ lý AI (mascot nút chat)** thay tại Cài đặt site → Brand; banner/logo/favicon/OG/ảnh section (kể cả icon/logo/cover từng item) đều có nút tải ảnh từ trước.
- **Mail đơn hàng đã VÀO INBOX** `vhdcorp.contact@gmail.com` (kiểm chứng IMAP: 25 mail đơn trong INBOX) — lưu ý Gmail có thể xếp vào tab "Cập nhật"; mail xác nhận gửi về **email khách nhập khi đặt**; người nhận thông báo admin đổi bằng biến **`ADMIN_EMAIL`** trong `be/.env`.
- TTS: prefetch audio khi hover nút loa (bấm là phát ngay); STT vốn realtime (chữ hiện khi đang nói — tốc độ engine thuộc trình duyệt/Google).

### Bổ sung 16/07 (2) — Avatar auto-lưu, loa phát tức thì, Google OAuth bật

- **Avatar khách**: chọn ảnh là **tự lưu ngay** vào hồ sơ (không phải bấm "Lưu thay đổi" nữa) — verified upload thật + reload vẫn còn. Đây là nguyên nhân "đổi avt load lại là mất" (upload chỉ set state chờ bấm lưu).
- **Nút loa phát tức thì**: audio được **tải trước tự động ngay khi trợ lý trả lời xong** (verified: request /api/tts tự bắn không cần bấm) + prefetch khi hover + cache theo text. Bấm loa là phát luôn.
- **Google OAuth ĐÃ BẬT**: điền GOOGLE_CLIENT_ID/SECRET vào `be/.env` (gitignored ✓), verified 302 → accounts.google.com đúng client_id + callback `http://localhost:8080/api/auth/google/callback`. Bước cuối (màn consent Google) cần người thật bấm — không automate được.

## 28. Cập nhật 2026-07-16 (2) — Admin chỉnh MỌI email + Google OAuth chuẩn

### Admin chỉnh mọi mail — Cài đặt site → tab EMAIL (mới)

- **Nhận diện chung** áp cho mọi mail (OTP, liên hệ, đơn hàng, hàng loạt): logo (uploader), tên hiển thị header, slogan, **địa chỉ + hotline chân trang**, dòng copyright, ghi chú thêm (MST/giấy phép…).
- **Nội dung từng loại mail**: tiêu đề + đoạn mở đầu cho 4 loại (xác nhận liên hệ/khách, báo liên hệ/admin, xác nhận đơn/khách, báo đơn/admin). Hỗ trợ biến `{name}`, `{code}`, `{total}`, `{siteName}`. Để trống = dùng mặc định. Bấm **Xuất bản** là áp dụng (MailService đọc SiteConfig PUBLISHED, cache 60s, DB lỗi tự fallback env — mail không bao giờ tắc).
- Kiểm chứng IMAP thật: đặt subject/intro/địa chỉ/footer-note tùy biến → gửi liên hệ → mail nhận được đúng 100% nội dung tùy biến (token thay đúng tên khách); đã dọn giá trị test, giữ địa chỉ chuyên nghiệp.
- Lưu ý ảnh logo "vỡ" trong screenshot của khách: URL logo trả HTTP 200 — đó là Gmail chặn tải ảnh lần đầu/dark-mode; giờ logo đổi được ngay trong tab Email nếu muốn dùng ảnh khác.

### Google OAuth — logic tài khoản chuẩn (đã có sẵn, verify code)

- Lần đầu đăng nhập Google → **tạo user mới** (email đã xác minh sẵn); các lần sau **dùng lại đúng tài khoản đó** (tìm theo googleId); nếu email đã tồn tại từ đăng ký thường → **link googleId vào tài khoản cũ** (không tạo trùng). Keys đã điền vào `be/.env` (gitignored), redirect flow verified 302 → accounts.google.com đúng client_id.

## 29. Cập nhật 2026-07-16 (3) — Phân quyền chat theo tài khoản + audit toàn bộ + hero config 100%

### PHÂN QUYỀN CHAT (fix "xem lịch sử của nhau")

- Trước: danh tính chat = UUID theo TRÌNH DUYỆT → ai dùng chung máy đều thấy lịch sử của nhau.
- Fix: đăng nhập → danh tính chat = `user-<id>` (mỗi tài khoản một hộp hội thoại riêng); khách vãng lai giữ UUID trình duyệt; hội thoại đang mở nhớ theo từng danh tính. **Verified browser**: customer đăng nhập KHÔNG thấy lịch sử của khách vãng lai/tài khoản khác; đăng xuất về đúng lịch sử anon.

### Audit phân quyền toàn bộ BE (ma trận đầy đủ trong phiên test)

- Public read: catalog/bài viết/danh mục/review/banner/config/suggest/recommendations ✓. Public write CHỈ: luồng auth + contact + track + voucher-validate (đều throttle) ✓.
- Self-service (đăng nhập): /users/me\*, đặt đơn + đơn của tôi, review (đã kiểm tra **ownership** — chỉ sửa review của mình), upload avatar (ép folder avatars, không vào thư viện admin) ✓.
- ADMIN/STAFF: toàn bộ quản trị (users/statistics/agent-knowledge chặn ở class-level @Roles); ADMIN-only: xóa, quản lý user, publish/rollback, gửi mail hàng loạt ✓. Root bất khả xâm phạm ✓.
- Kết luận: không còn lỗ hổng; 2 lỗ đã vá trong đợt này là chat identity + media library.

### Ảnh/icon hỏi trong screenshot — chỉnh ở đâu (đã bổ sung nốt phần thiếu)

- **Hero trang chủ**: heading/subheading/CTA/ảnh nền (`bgImage`)/**badge "B2B"**/**3 chip cam kết (label+desc, thêm-xóa)** → Builder → Trang chủ → section Hero (trustItems/badge mới thêm vào type + seed + merge thẳng vào layout đang publish, không đè tùy chỉnh khác).
- **3 card Lĩnh vực (icon minh họa)**: Builder → section "Lĩnh vực" → từng item có ô icon (dán URL hoặc bấm nút tải ảnh — key icon dạng đường dẫn tự hiện uploader).
- Placeholder SĐT/địa chỉ đổi thành "VD: …" tránh nhầm là dữ liệu thật.
- Google login: flow đã tối ưu sẵn (1 call /auth/me + redirect); độ trễ chủ yếu là consent Google + dev-mode compile route lần đầu — bản `next build` production nhanh hơn đáng kể.
