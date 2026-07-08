# PRD — VHD Corp E-Commerce Platform

> **Version:** 1.6.2 · **Date:** 2026-05-06
> **Tagline:** Kết nối giá trị – Hợp tác vững bền

---

## 1. Tổng quan

VHD Corp là tổng kho cung cấp sản phẩm nhựa & cao su và thực phẩm làng nghề truyền thống.

**2 apps trong monorepo:**

| App    | Route group | Đối tượng                 | Mục tiêu                                |
| ------ | ----------- | ------------------------- | --------------------------------------- |
| Client | `(client)/` | Khách hàng B2B/B2C        | Khám phá sản phẩm, liên hệ đặt hàng     |
| Admin  | `admin/`    | Nhân viên / quản trị viên | Vận hành nội dung & tùy chỉnh giao diện |

> **Quan trọng**: Web phải SEO tốt, Admin có quyền tùy chỉnh mọi thứ từ ui cho đến tất cả mọi thứ, web phải thật nhiều animation + 3d để thu hút.

---

### ⚠️ Code Convention bắt buộc

> Routes, file names, folder names, variables, functions, types — **tất cả dùng tiếng Anh**.
>
> UI text hiển thị cho người dùng (label, heading, copy) — **chỉ tiếng Việt qua `messages/vi.json`**. Không có toggle ngôn ngữ, không có locale prefix trong URL.

---

## 2. Tech Stack

### Frontend

> Skills: `vercel-react-best-practices` · `typescript-best-practices` · `tailwindcss` · `shadcn-ui` · `tanstack-query-best-practices` · `react-hook-form-zod` · `framer-motion-animator` · `gsap-scrolltrigger` · `seo` · `impeccable` · `3d-web-experience`

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Framework    | Next.js 16 (App Router, RSC, ISR)                                                                            |
| UI           | shadcn/ui + Tailwind CSS v4                                                                                  |
| Theme        | Dark / Light mode (`next-themes`)                                                                            |
| Ngôn ngữ     | Tiếng Việt duy nhất — không toggle ngôn ngữ, không locale prefix, UI strings qua `messages/vi.json`          |
| State        | Zustand (`authStore`, `uiStore`, `siteConfigStore`)                                                          |
| Server state | TanStack Query v5                                                                                            |
| Forms        | React Hook Form + Zod                                                                                        |
| Animation    | Framer Motion + GSAP ScrollTrigger                                                                           |
| Drag & drop  | `@dnd-kit/core` + `@dnd-kit/sortable` (admin builder)                                                        |
| Images       | File upload qua BE `/media/upload` → Cloudinary/local fallback → DB lưu URL + `next/image`                   |
| Rich editor  | TinyMCE hoặc editor tương đương cấp production (Tiptap/ProseMirror/Editor.js) cho bài viết và mô tả sản phẩm |
| Design refs  | `clinet-DESIGN.md` (client) · `admin-genesis-DESIGN.md` (admin)                                              |

### Backend

> Skills: `nestjs-best-practices` · `nodejs-best-practices` · `prisma-client-api` · `prisma-database-setup` · `postgresql-table-design` · `postgresql-optimization`

|           |                                                                    |
| --------- | ------------------------------------------------------------------ |
| Framework | NestJS (feature-module architecture)                               |
| ORM       | Prisma + PostgreSQL                                                |
| Auth      | JWT HttpOnly Cookie — access (15min) + refresh (7d) + Google OAuth |
| Media     | Cloudinary SDK                                                     |
| Security  | Helmet, CSRF guard, `@nestjs/throttler`, sanitize-html interceptor |

---

## 3. Client Routes

> Route paths dùng **tiếng Anh**. Giao diện hiển thị **tiếng Việt**.

| Route                | Label             | Mô tả                                              |
| -------------------- | ----------------- | -------------------------------------------------- |
| `/`                  | Trang chủ         | Hero, featured products, banner, blog preview      |
| `/products`          | Sản phẩm          | Danh sách, filter, sort, infinite scroll           |
| `/products/[slug]`   | Chi tiết sản phẩm | Gallery, specs, CTA liên hệ, related products      |
| `/categories/[slug]` | Danh mục          | Sản phẩm theo danh mục                             |
| `/posts`             | Tin tức           | Danh sách bài viết, filter tag                     |
| `/posts/[slug]`      | Bài viết          | Nội dung, bài liên quan, CTA                       |
| `/about`             | Giới thiệu        | Câu chuyện thương hiệu, đội ngũ                    |
| `/contact`           | Liên hệ           | Form liên hệ (RHF + Zod), bản đồ                   |
| `/search`            | Tìm kiếm          | Full-text search sản phẩm + bài viết               |
| `/account`           | Tài khoản         | Profile, đổi mật khẩu — protected                  |
| `/account/profile`   | Hồ sơ             | Cập nhật thông tin, avatar                         |
| `/account/password`  | Đổi mật khẩu      | Chỉ hiện với tài khoản email (ẩn với Google OAuth) |

### SEO — Yêu cầu bắt buộc

#### Metadata

- `generateMetadata` cho mọi trang — `<title>` max 60 ký tự, `<meta description>` max 160 ký tự
- Open Graph: `og:title`, `og:description`, `og:image` (1200×630), `og:type`
- Twitter Card: `summary_large_image`
- `robots: index, follow` mặc định; `noindex` cho `/admin/*`, `/api/*`, `/account/*`, `/login`, `/register`, `/callback`

#### Structured Data (JSON-LD)

| Trang              | Schema                                                    |
| ------------------ | --------------------------------------------------------- |
| Trang chủ          | `Organization` + `WebSite` + `SearchAction`               |
| `/products/[slug]` | `Product` (name, image, offers, brand, aggregateRating)   |
| `/posts/[slug]`    | `Article` (headline, author, datePublished, dateModified) |
| Mọi trang          | `BreadcrumbList`                                          |
| `/contact`         | `LocalBusiness`                                           |

#### Technical SEO

- Slug không dấu, unique, không đổi sau publish (vd: `mien-rong-quoc-oai`)
- `canonical` URL đúng cho mọi trang
- `/sitemap.xml` auto-generated từ DB (products + posts + static pages)
- `/robots.txt`: `Allow /`, `Disallow /admin/ /api/ /account/ /login /register /callback`, khai báo sitemap

#### Core Web Vitals

- LCP < 2.5s, CLS < 0.1, INP < 200ms
- `next/image` với `sizes` + `priority` cho ảnh hero
- Dynamic import cho heavy components

### Dark / Light Mode

- `next-themes`, toggle ở header, persist `localStorage`

### Ngôn ngữ (Tiếng Việt)

- UI chỉ hỗ trợ **tiếng Việt**.
- Không có toggle ngôn ngữ ở header, không lưu locale trong `localStorage`/cookie, không có route prefix theo locale.
- Source UI string duy nhất: `messages/vi.json`.
- Nếu dùng `next-intl`, chỉ load locale `vi`; không dùng `useLocale()` cho toggle runtime.

### Auth Client

#### Cookie-based JWT

- Access Token + Refresh Token → **HttpOnly Cookie** (không accessible từ JS)
- Silent refresh tự động khi access token hết hạn
- Protected routes: `/account/*` — Next.js middleware kiểm tra cookie, redirect về `/login?next=/account`

#### Trang `/login` — UX

- Form email/password + nút **"Đăng nhập bằng Google"** (nổi bật, có Google icon)
- Divider `— hoặc —` giữa 2 phương thức
- Link "Chưa có tài khoản? Đăng ký" → `/register`
- Sau đăng nhập thành công: redirect về `?next=` param hoặc `/account`

#### Google OAuth Flow (client)

1. User click nút **"Đăng nhập bằng Google"** tại `/login`
2. FE redirect → `GET /auth/google` (BE) → Google consent screen
3. Google callback → `GET /auth/google/callback` (BE)
4. BE tìm hoặc tạo User bằng `googleId` + `email`
5. BE set `access_token` + `refresh_token` cookie → redirect về FE: `FRONTEND_URL/callback?next=/account`
6. FE page `/callback` nhận redirect, đọc cookie (đã set bởi BE), cập nhật `authStore`, redirect về `next`

#### Trang `/register` — UX

- Form: name, email, password, confirm password
- Nút **"Đăng ký bằng Google"** (cùng flow OAuth, tự động tạo account)
- Sau đăng ký: auto login, redirect `/account`

#### Trang `/account` — layout

- Sidebar với avatar, tên, email, badge role
- Sub-nav: Hồ sơ / Đổi mật khẩu (ẩn nếu Google account)
- Thông tin Google account: badge "Tài khoản Google", không hiện field password

---

## 4. Admin Routes

> Route paths **tiếng Anh**. UI labels **tiếng Việt**.

| Route                    | UI Label                      | Mô tả                                                            |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------- |
| `/admin`                 | → redirect `/admin/dashboard` |                                                                  |
| `/admin/dashboard`       | Dashboard                     | KPIs: lượt xem, sản phẩm, bài viết, user mới — biểu đồ 7/30 ngày |
| `/admin/products`        | Sản phẩm                      |                                                                  |
| `/admin/products/new`    | Tạo sản phẩm                  |                                                                  |
| `/admin/products/[id]`   | Sửa sản phẩm                  |                                                                  |
| `/admin/categories`      | Danh mục                      |                                                                  |
| `/admin/categories/new`  | Tạo danh mục                  |                                                                  |
| `/admin/categories/[id]` | Sửa danh mục                  |                                                                  |
| `/admin/posts`           | Bài viết                      |                                                                  |
| `/admin/posts/new`       | Soạn bài viết                 |                                                                  |
| `/admin/posts/[id]`      | Sửa bài viết                  |                                                                  |
| `/admin/users`           | Người dùng                    |                                                                  |
| `/admin/users/[id]`      | Chi tiết người dùng           |                                                                  |
| `/admin/reviews`         | Đánh giá                      |                                                                  |
| `/admin/reviews/[id]`    | Chi tiết đánh giá             |                                                                  |
| `/admin/banners`         | Banner                        |                                                                  |
| `/admin/banners/new`     | Tạo banner                    |                                                                  |
| `/admin/banners/[id]`    | Sửa banner                    |                                                                  |
| `/admin/media`           | Thư viện ảnh                  |                                                                  |
| `/admin/builder`         | Visual Page Builder           |                                                                  |
| `/admin/settings`        | Cài đặt                       |                                                                  |
| `/admin/login`           | Đăng nhập                     | Chỉ email/password — **không có Google OAuth** (bảo mật admin)   |

### CRUD Modules

| Module     | Tính năng                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Products   | Tạo/sửa/xóa, mô tả bằng rich editor, upload ảnh qua BE, tồn kho, giá, tag, SEO meta override                               |
| Categories | Cây đa cấp, slug tự động, thứ tự hiển thị                                                                                  |
| Posts      | Rich editor production-grade (TinyMCE hoặc tương đương như Tiptap/ProseMirror), SEO meta tùy chỉnh, publish/draft/schedule |
| Users      | Xem, phân quyền (`customer/staff/admin`), block                                                                            |
| Reviews    | Duyệt/ẩn review từ khách                                                                                                   |
| Banners    | Upload, vị trí, bật/tắt                                                                                                    |
| Media      | Upload file qua BE lên Cloudinary/local fallback, lưu metadata + URL vào DB, tag, folder                                   |
| Settings   | Thông tin công ty, analytics ID, SEO mặc định toàn site                                                                    |

### Rich Editor — BẮT BUỘC

- Admin phải có bộ soạn thảo WYSIWYG cấp production cho **Posts.content** và **Products.description**.
- Chấp nhận: TinyMCE, Tiptap/ProseMirror, Editor.js hoặc editor tương đương nếu đáp ứng đủ toolbar, extension và khả năng upload ảnh.
- Tối thiểu phải có: bold, italic, underline, heading H1–H3, ordered/unordered list, blockquote, code/code block, horizontal rule, link, image, undo/redo, preview HTML.
- Ảnh chèn trong editor **không được nhập URL thủ công làm flow chính**. User chọn file trong editor → FE gửi multipart tới `POST /api/media/upload` → BE upload lên Cloudinary/local fallback → BE lưu `Media.url` vào DB → editor insert URL đã trả về.
- Nội dung HTML lưu DB phải qua sanitize allowlist ở BE, giữ các tag editor hợp lệ (`h1-h6`, `p`, `a`, `img`, `ul/ol/li`, `blockquote`, `pre/code`, `strong/em/u`, `hr`) và chặn script/event handler.

### ⭐ Visual Page Builder (`/admin/builder`)

Admin tùy chỉnh toàn bộ giao diện client **không cần code**. Đây là tính năng cốt lõi, phải đạt UX chuyên nghiệp nhất.

#### Layout 3 Panel

```text
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar: [← Undo] [Redo →] [📱 Mobile] [📟 Tablet] [💻 Desktop] [Preview] [Save Draft] [🚀 Publish] │
├──────────────┬──────────────────────────────────┬───────────────┤
│ LEFT PANEL   │         CENTER CANVAS            │  RIGHT PANEL  │
│ 280px        │    Live preview (iframe/RSC)      │  320px        │
│              │    Responsive width toggle        │               │
│ Tabs:        │                                   │  Context-aware│
│ • Sections   │    Click section → highlight     │  properties   │
│ • Components │    Drag handle to reorder         │  panel for    │
│ • Pages      │    Double-click text → inline     │  selected     │
│ • Theme      │    edit                           │  element      │
│ • History    │                                   │               │
└──────────────┴──────────────────────────────────┴───────────────┘
```

#### Left Panel — Tabs

##### Tab: Sections

- Danh sách sections hiện có trên trang đang chọn (draggable list)
- Mỗi item: icon type, tên section, toggle visible (👁), xóa (🗑)
- Nút **"+ Thêm section"** → modal chọn section type
- Drag handle để reorder (dnd-kit)

**Tab: Components** _(thư viện kéo thả)_

- Grid các block có thể kéo vào canvas: Hero, Banner, ProductGrid, BlogGrid, Testimonial, CTA, Divider, CustomHTML
- Mỗi component có thumbnail preview

##### Tab: Pages

- Chọn trang để edit: Trang chủ / Giới thiệu / Liên hệ
- Breadcrumb trang đang active

**Tab: Theme** _(global design tokens)_

- **Brand:** Logo upload, favicon upload, site name, tagline
- **Colors:** Color picker (hex + hsl) cho: Primary, Accent, Highlight, Background, Surface, Text, Danger
  - Live preview ngay khi kéo picker
  - Preset palettes (4 bộ màu gợi ý)
- **Typography:** Dropdown font heading (Google Fonts), font body, base font size (12–20px), line-height
- **Spacing:** Global section padding (compact / normal / spacious)
- **Border radius:** global corner radius slider

**Tab: History** _(version control)_

- Timeline các lần save với timestamp + tên người save
- Nút **"Restore"** về bất kỳ version nào
- Badge: `Published` / `Draft` / `Current`
- So sánh diff giữa 2 version (highlight thay đổi)

#### Center Canvas

- Render **iframe** nhúng FE app (đọc SiteConfig draft từ store/API)
- **Responsive toggle** ở toolbar: Mobile (375px) / Tablet (768px) / Desktop (100%)
- Click vào section → highlight border xanh + show controls
- **Drag handle** (⠿) ở góc trái section → kéo để reorder
- **Double-click** vào text → inline edit trực tiếp trên canvas
- **Click ảnh** → mở media picker (Cloudinary browser)
- Section đang selected có overlay semi-transparent với actions: `Edit` `Move ↑↓` `Duplicate` `Delete`

#### Right Panel — Properties

Thay đổi theo context của element đang được chọn:

| Element được chọn         | Properties hiện ra                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Section Hero              | Heading, subheading, CTA text, CTA link, background image/video, overlay opacity, text alignment, min-height |
| Section Featured Products | Heading, số sản phẩm hiển thị (4/8/12), layout (grid/carousel), filter category                              |
| Section Blog Preview      | Heading, số bài (3/6), layout (list/grid), filter tag                                                        |
| Section Banner            | Ảnh (upload/Cloudinary), link URL, alt text, position (full-width/boxed)                                     |
| Section Testimonial       | List quotes (add/remove), avatar, tên, chức vụ, company                                                      |
| Section CTA               | Heading, body text, nút CTA (text + link + màu), background color/image                                      |
| Section Custom HTML       | Textarea nhập HTML, warning inject unsafe                                                                    |
| Navigation                | Kéo thả menu items, add/remove, nested dropdown, external link toggle                                        |
| Footer                    | Cột (add/remove), links per cột, social icons (có/không + URL), copyright text                               |
| _Không chọn gì_           | Hiện tab Theme (global)                                                                                      |

**Controls chung cho mọi section:**

- Section spacing: padding top/bottom (slider px)
- Background: None / Color / Image / Gradient
- Animation entrance: None / Fade up / Fade in / Slide left / Zoom in
- Animation delay: 0–1000ms
- Visible/Hidden toggle

#### Toolbar Actions

| Action                    | Behavior                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| Undo / Redo               | Ctrl+Z / Ctrl+Y — up to 50 steps                                 |
| Mobile / Tablet / Desktop | Toggle canvas width                                              |
| Preview                   | Mở tab mới xem FE với draft config (chưa publish)                |
| Save Draft                | Lưu vào DB với `status: draft` — không ảnh hưởng production      |
| 🚀 Publish                | Apply config draft → production, tạo bản ghi `SiteConfigHistory` |

#### Section Types — Danh sách đầy đủ

| Type                | Mô tả                                | Props chính                                       |
| ------------------- | ------------------------------------ | ------------------------------------------------- |
| `hero`              | Hero banner toàn chiều rộng          | heading, subheading, cta, bgImage, overlay, align |
| `featured-products` | Grid/carousel sản phẩm nổi bật       | heading, limit, categoryId, layout                |
| `category-grid`     | Grid danh mục với ảnh                | heading, categoryIds[], columns                   |
| `banner-slider`     | Slider banner nhiều ảnh              | slides[] (image, link, alt), autoplay, interval   |
| `blog-preview`      | Preview bài viết mới nhất            | heading, limit, layout, tagFilter                 |
| `testimonials`      | Slider đánh giá khách hàng           | quotes[], autoplay                                |
| `contact-cta`       | Block CTA liên hệ                    | heading, body, ctaText, ctaLink, bgColor          |
| `stats-counter`     | Số liệu ấn tượng (counter animation) | stats[] (label, value, unit)                      |
| `partners`          | Logo đối tác                         | logos[] (image, name, link), grayscale toggle     |
| `custom-html`       | HTML tự do                           | html string, inject warning                       |

#### SiteConfig JSONB Schema (đầy đủ)

```jsonc
{
  "brand": {
    "siteName": "VHD Corp",
    "tagline": "Kết nối giá trị – Hợp tác vững bền",
    "logo": { "url": "...", "publicId": "..." },
    "favicon": { "url": "..." },
    "ogDefaultImage": { "url": "...", "width": 1200, "height": 630 },
  },
  "theme": {
    "colors": {
      "primary": "#1B3A8C",
      "accent": "#4FB8E7",
      "highlight": "#F5A623",
      "danger": "#C8102E",
      "background": "#FFFFFF",
      "surface": "#F8F9FA",
      "text": "#1A1A2E",
    },
    "fonts": {
      "heading": "Be Vietnam Pro",
      "body": "Inter",
      "baseFontSize": 16,
    },
    "spacing": "normal",
    "borderRadius": 8,
  },
  "seo": {
    "titleTemplate": "%s | VHD Corp",
    "defaultDescription": "...",
    "ogImage": "...",
    "googleAnalyticsId": "",
    "googleTagManagerId": "",
    "facebookPixelId": "",
  },
  "pages": {
    "home": {
      "sections": [
        {
          "id": "uuid",
          "type": "hero",
          "order": 1,
          "visible": true,
          "props": {
            "heading": "Tổng kho nhựa, cao su & thực phẩm làng nghề",
            "subheading": "...",
            "ctaText": "Xem sản phẩm",
            "ctaLink": "/products",
            "bgImage": { "url": "...", "publicId": "..." },
            "overlayOpacity": 0.4,
            "textAlign": "center",
            "minHeight": 600,
          },
          "animation": { "type": "fade-up", "delay": 0 },
          "spacing": { "paddingTop": 80, "paddingBottom": 80 },
        },
        {
          "id": "uuid",
          "type": "featured-products",
          "order": 2,
          "visible": true,
          "props": { "heading": "Sản phẩm nổi bật", "limit": 8, "layout": "grid" },
        },
        {
          "id": "uuid",
          "type": "category-grid",
          "order": 3,
          "visible": true,
          "props": { "heading": "Danh mục", "columns": 4 },
        },
        {
          "id": "uuid",
          "type": "blog-preview",
          "order": 4,
          "visible": true,
          "props": { "heading": "Tin tức", "limit": 3 },
        },
        {
          "id": "uuid",
          "type": "contact-cta",
          "order": 5,
          "visible": true,
          "props": { "heading": "Liên hệ đặt hàng", "ctaText": "Liên hệ ngay", "ctaLink": "/contact" },
        },
      ],
    },
    "about": { "sections": [] },
    "contact": { "sections": [] },
  },
  "navigation": [
    { "id": "uuid", "label": "Trang chủ", "href": "/", "order": 1, "children": [] },
    {
      "id": "uuid",
      "label": "Sản phẩm",
      "href": "/products",
      "order": 2,
      "children": [
        { "id": "uuid", "label": "Nhựa & Cao su", "href": "/categories/nhua-cao-su" },
        { "id": "uuid", "label": "Thực phẩm làng nghề", "href": "/categories/thuc-pham" },
      ],
    },
    { "id": "uuid", "label": "Tin tức", "href": "/posts", "order": 3, "children": [] },
    { "id": "uuid", "label": "Giới thiệu", "href": "/about", "order": 4, "children": [] },
    { "id": "uuid", "label": "Liên hệ", "href": "/contact", "order": 5, "children": [] },
  ],
  "footer": {
    "columns": [
      { "heading": "Về chúng tôi", "links": [{ "label": "Giới thiệu", "href": "/about" }] },
      { "heading": "Sản phẩm", "links": [{ "label": "Nhựa & Cao su", "href": "/categories/nhua-cao-su" }] },
      { "heading": "Hỗ trợ", "links": [{ "label": "Liên hệ", "href": "/contact" }] },
    ],
    "social": [
      { "platform": "facebook", "url": "" },
      { "platform": "zalo", "url": "" },
      { "platform": "youtube", "url": "" },
    ],
    "copyright": "© 2026 VHD Corp. All rights reserved.",
    "showMap": true,
  },
  "customCss": "",
}
```

#### Workflow Publish

```text
Edit in Builder
     ↓
[Save Draft] → status: "draft" → chỉ admin preview thấy
     ↓
[🚀 Publish] → status: "published" → FE production đọc
              → tạo SiteConfigHistory snapshot
              → admin có thể Restore về version cũ
```

#### UX Rules bắt buộc cho Builder

- **Không reload trang** khi edit — mọi thay đổi phản ánh real-time trên canvas
- **Auto-save draft** mỗi 30 giây nếu có thay đổi chưa lưu
- **Unsaved changes warning** khi navigate away (browser beforeunload)
- **Optimistic UI** — cập nhật canvas ngay, sync BE background
- **Error rollback** — nếu save thất bại, revert về state trước
- **Keyboard shortcuts**: Ctrl+S (save draft), Ctrl+Z/Y (undo/redo), Delete (xóa section)
- **Empty state** — khi canvas trống: hướng dẫn kéo section từ panel trái

---

## 5. Backend API

### NestJS Modules

> `nestjs-best-practices`: feature modules, constructor injection, DTO serialization.

| Module             | Prefix         | Mô tả                                                |
| ------------------ | -------------- | ---------------------------------------------------- |
| `AuthModule`       | `/auth`        | Login, register, refresh token, Google OAuth, logout |
| `UserModule`       | `/users`       | CRUD users, roles                                    |
| `ProductModule`    | `/products`    | CRUD, search, filter, slug auto                      |
| `CategoryModule`   | `/categories`  | Cây danh mục                                         |
| `PostModule`       | `/posts`       | CRUD bài viết, SEO meta                              |
| `ReviewModule`     | `/reviews`     | Duyệt/ẩn review                                      |
| `BannerModule`     | `/banners`     | Banner                                               |
| `MediaModule`      | `/media`       | Upload Cloudinary                                    |
| `SiteConfigModule` | `/site-config` | Đọc/ghi config builder                               |
| `StatisticsModule` | `/statistics`  | Dashboard analytics                                  |
| `HealthModule`     | `/health`      | Health check                                         |

### Auth Cookie Flow

**Email / Password:**

```text
POST /auth/login
  → Set-Cookie: access_token  (HttpOnly, Secure, SameSite=Strict, 15min)
  → Set-Cookie: refresh_token (HttpOnly, Secure, SameSite=Strict, 7d)

POST /auth/register → tạo User → auto login → set cookies
POST /auth/refresh  → reads refresh_token cookie → issues new access_token
POST /auth/logout   → clears both cookies, xóa refreshToken trong DB
```

**Google OAuth:**

```text
GET  /auth/google
  → redirect đến Google consent screen

GET  /auth/google/callback
  → Google trả về profile (email, name, googleId, avatar)
  → BE tìm User theo googleId hoặc email; nếu không có → tạo mới
  → Set-Cookie: access_token + refresh_token
    → redirect về: FRONTEND_URL/callback?next=/account
```

**Lưu ý bảo mật:**

- `refresh_token` được hash và lưu vào DB (`User.refreshTokenHash`)
- Khi logout hoặc refresh: xóa/thay thế token trong DB → ngăn token reuse
- Admin login (`/admin/login`): **chỉ email/password, không có Google OAuth**

### Prisma Schema

> **Xem schema Prisma đầy đủ tại [`docs/DATABASE.md`](DATABASE.md)** — 9 models, enums, indexes, design decisions.
> Bất kỳ task liên quan đến Prisma/DB đều phải đọc file đó trước.

---

## 6. Design System

**Brand Colors:**

| Token              | Hex       | Dùng cho                        |
| ------------------ | --------- | ------------------------------- |
| `brand-blue-dark`  | `#1B3A8C` | Primary CTA, header, active nav |
| `brand-blue-light` | `#4FB8E7` | Accent, hover, icon             |
| `brand-yellow`     | `#F5A623` | Highlight, badge, promo         |
| `brand-red`        | `#C8102E` | Destructive, sale label         |

- **Client**: `clinet-DESIGN.md` — Apple-style, photography-first, clean, spacious
- **Admin**: `admin-genesis-DESIGN.md` — Genesis editorial, high info density
- **Font**: Be Vietnam Pro (heading) + Inter (body) — tối ưu tiếng Việt

---

## 7. Directory Structure

```text
vhdcorp/
├── fe/
│   ├── app/
│   │   ├── (client)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                     # Home
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                 # Product list
│   │   │   │   └── [slug]/page.tsx          # Product detail
│   │   │   ├── categories/[slug]/page.tsx
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   └── search/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/page.tsx            # Google OAuth redirect landing
│   │   ├── account/
│   │   │   ├── layout.tsx                   # Protected layout
│   │   │   ├── page.tsx                     # → redirect /account/profile
│   │   │   ├── profile/page.tsx
│   │   │   └── password/page.tsx            # Ẩn với Google account
│   │   ├── admin/
│   │   │   ├── layout.tsx                   # Protected layout (kiểm tra role admin/staff)
│   │   │   ├── login/
│   │   │   │   ├── layout.tsx               # Public layout (không wrap admin sidebar)
│   │   │   │   └── page.tsx                 # Email/password only
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── posts/
│   │   │   ├── users/
│   │   │   ├── reviews/
│   │   │   ├── banners/
│   │   │   ├── media/
│   │   │   ├── builder/                     # Visual Page Builder
│   │   │   └── settings/
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── client/                          # Client UI components
│   │   ├── admin/                           # Admin UI components
│   │   ├── builder/                         # Drag-drop builder
│   │   └── ui/                              # shadcn/ui primitives
│   ├── hooks/
│   ├── services/                            # TanStack Query hooks + API calls
│   ├── store/                               # Zustand: authStore, uiStore, siteConfigStore
│   ├── types/
│   ├── lib/                                 # axios, utils, cloudinary
│   └── messages/
│       └── vi.json                          # Chuỗi tiếng Việt duy nhất
├── be/
│   └── src/
│       ├── models/                          # Domain feature modules
│       │   ├── product/
│       │   ├── category/
│       │   ├── post/
│       │   ├── review/
│       │   ├── banner/
│       │   ├── media/
│       │   ├── site-config/
│       │   ├── statistics/
│       │   └── user/
│       ├── authentication/
│       ├── health/
│       ├── common/                          # guards, pipes, interceptors, filters
│       ├── prisma/
│       ├── providers/
│       └── services/
└── docs/
    ├── PRD.md
    └── DATABASE.md
```

**Rules bắt buộc:**

- Routes, file/folder names, variables, functions, types → **tiếng Anh**
- UI text hiển thị → **viết qua `messages/vi.json`**, không hardcode, không tạo bản dịch ngôn ngữ khác
- API calls → `services/` — không fetch trực tiếp trong component
- Component client → `components/client/`, admin → `components/admin/`
- Mỗi NestJS domain → 1 module riêng trong `models/`
- Review vị trí file sau mỗi feature — không để sai module

---

## 8. Cloudinary Folders

```text
vhd-corp/
├── products/     # Ảnh sản phẩm
├── posts/        # Ảnh bài viết
├── banners/      # Banner
├── brand/        # Logo, favicon, default OG image
└── avatars/      # Avatar người dùng
```

---

## 9. Non-functional Requirements

| Tiêu chí        | Yêu cầu                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| Performance     | API p95 < 300ms, Core Web Vitals "Good" (LCP < 2.5s, CLS < 0.1, INP < 200ms) |
| Security        | OWASP Top 10, HttpOnly cookie, CSRF guard, rate limit, sanitize input        |
| SEO             | SSR/ISR, sitemap auto, structured data                                       |
| Accessibility   | WCAG 2.1 AA — contrast, keyboard nav, ARIA                                   |
| Ngôn ngữ        | Tiếng Việt duy nhất, không toggle ngôn ngữ, không persist locale             |
| Maintainability | Convention bắt buộc, review per feature, không code lan man                  |

---

## 9b. Pre-commit hook (BẮT BUỘC)

**Mục tiêu**: chặn commit nếu code vi phạm format/lint/type. Code rác KHÔNG được merge.

### Stack

- `husky` — quản lý git hooks ở root monorepo
- `lint-staged` — chạy linter/formatter chỉ trên file đã staged (nhanh)
- `prettier` — format JS/TS/JSON/MD/CSS thống nhất 2 workspace
- `eslint` — đã có sẵn ở `fe/` (`eslint-config-next`) và `be/` (`@typescript-eslint`)

### Cấu trúc

```text
vhdcorp/
├── package.json                # Workspace root: husky, lint-staged, scripts proxy
├── .husky/
│   └── pre-commit              # `yarn lint-staged`
├── .lintstagedrc.json          # Map glob → command per workspace
├── .prettierrc
└── .prettierignore
```

### Rules áp dụng mỗi commit

| Workspace | Glob                    | Command                                              |
| --------- | ----------------------- | ---------------------------------------------------- |
| `fe/`     | `fe/**/*.{ts,tsx}`      | `eslint --fix --max-warnings=0` + `prettier --write` |
| `fe/`     | `fe/**/*.{json,css,md}` | `prettier --write`                                   |
| `be/`     | `be/**/*.ts`            | `eslint --fix --max-warnings=0` + `prettier --write` |
| `be/`     | `be/**/*.{json,md}`     | `prettier --write`                                   |

> Type-check (`tsc --noEmit`) không chạy trong pre-commit (chậm với codebase lớn). Đẩy sang **pre-push** hoặc CI để giữ tốc độ commit < 5s.

### Cấm tuyệt đối

- `git commit --no-verify` — chỉ dùng khi user **explicit** yêu cầu, KHÔNG được tự ý thêm
- KHÔNG đưa `--no-verify` vào CI/script/alias
- KHÔNG bypass pre-commit để "fix nhanh" — sửa vi phạm trước

### Setup lệnh (chạy 1 lần ở root)

```bash
yarn add -D -W husky lint-staged prettier
yarn husky init
echo "yarn lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

---

## 10. Dependencies

> Package manager: **yarn**

### Frontend (`fe/`)

| Package                          | Version    | Mục đích                                                     |
| -------------------------------- | ---------- | ------------------------------------------------------------ |
| `next`                           | `16.2.4`   | Framework                                                    |
| `react` / `react-dom`            | `19.2.4`   | UI runtime                                                   |
| `next-themes`                    | `^0.4.6`   | Dark / Light mode                                            |
| `next-intl`                      | `^4.11.0`  | Message provider single-locale `vi`                          |
| `zustand`                        | `^5.0.12`  | State: authStore, uiStore, siteConfigStore                   |
| `@tanstack/react-query`          | `^5.100.9` | Server state + mutations                                     |
| `@tanstack/react-query-devtools` | `^5.100.9` | Dev tools                                                    |
| `react-hook-form`                | `^7.75.0`  | Form state                                                   |
| `@hookform/resolvers`            | `^5.2.2`   | Zod adapter                                                  |
| `zod`                            | `^4.4.2`   | Schema validation                                            |
| `axios`                          | `^1.16.0`  | HTTP client                                                  |
| `motion`                         | `^12.38.0` | Animation (Framer Motion v12)                                |
| `gsap`                           | `^3.15.0`  | ScrollTrigger, timeline animation                            |
| `@dnd-kit/core`                  | `^6.3.1`   | Drag & drop (admin builder)                                  |
| `@dnd-kit/sortable`              | `^10.0.0`  | Sortable lists                                               |
| `@dnd-kit/utilities`             | `^3.2.2`   | DnD helpers                                                  |
| `@tiptap/react`                  | `^3.22.5`  | Rich text editor                                             |
| `@tiptap/starter-kit`            | `^3.22.5`  | Tiptap extensions bundle                                     |
| `@tiptap/extension-image`        | `^3.22.5`  | Image trong editor                                           |
| `next-cloudinary`                | `^6.17.5`  | Cloudinary image helpers/CDN rendering; upload vẫn đi qua BE |
| `sharp`                          | `^0.34.5`  | Image optimization cho next/image                            |
| `shadcn`                         | `^4.6.0`   | Component CLI                                                |
| `radix-ui`                       | `^1.4.3`   | Headless UI primitives                                       |
| `lucide-react`                   | `^1.14.0`  | Icons                                                        |
| `tailwind-merge`                 | `^3.5.0`   | Class merging                                                |
| `class-variance-authority`       | `^0.7.1`   | Variant styles                                               |
| `clsx`                           | `^2.1.1`   | Conditional classes                                          |
| `three`                          | `^0.184.0` | 3D (dynamic import)                                          |
| `tw-animate-css`                 | `^1.4.0`   | Tailwind animation utilities                                 |

**Dev dependencies FE:**

| Package                             | Version    |
| ----------------------------------- | ---------- |
| `tailwindcss`                       | `^4`       |
| `@tailwindcss/postcss`              | `^4`       |
| `typescript`                        | `^5`       |
| `@types/node`                       | `^20`      |
| `@types/react` / `@types/react-dom` | `^19`      |
| `@types/three`                      | `^0.184.0` |
| `eslint`                            | `^9`       |
| `eslint-config-next`                | `16.2.4`   |

---

### Backend (`be/`)

| Package                                        | Version    | Mục đích                     |
| ---------------------------------------------- | ---------- | ---------------------------- |
| `@nestjs/common` / `core` / `platform-express` | `^11.1.19` | Framework                    |
| `@nestjs/config`                               | `^4.0.4`   | Env config (ConfigService)   |
| `@nestjs/jwt`                                  | `^11.0.2`  | JWT                          |
| `@nestjs/passport`                             | `^11.0.5`  | Auth strategy                |
| `@nestjs/swagger`                              | `^11.4.2`  | OpenAPI docs                 |
| `@nestjs/throttler`                            | `^6.5.0`   | Rate limiting                |
| `@nestjs/mapped-types`                         | `^2.1.1`   | DTO helpers                  |
| `@prisma/client`                               | `^7.8.0`   | ORM client                   |
| `@prisma/adapter-pg`                           | `^7.8.0`   | PG adapter                   |
| `prisma`                                       | `^7.8.0`   | CLI + migrations             |
| `passport`                                     | `^0.7.0`   | Auth middleware              |
| `passport-google-oauth20`                      | `^2.0.0`   | Google OAuth                 |
| `passport-jwt`                                 | `^4.0.1`   | JWT strategy                 |
| `pg`                                           | `^8.14.1`  | PostgreSQL driver            |
| `cookie-parser`                                | `^1.4.7`   | HttpOnly cookie              |
| `helmet`                                       | `^8.1.0`   | HTTP security headers        |
| `joi`                                          | `^18.2.1`  | Env validation khi khởi động |
| `cloudinary`                                   | `^2.10.0`  | Cloudinary SDK               |
| `sanitize-html`                                | `^2.17.3`  | Sanitize HTML input          |
| `slugify`                                      | `^1.6.9`   | Auto-generate slug           |
| `class-validator`                              | `^0.15.1`  | DTO validation               |
| `class-transformer`                            | `^0.5.1`   | Serialization                |
| `date-fns`                                     | `^4.1.0`   | Date utils                   |
| `google-auth-library`                          | `^10.6.2`  | Google token verify          |
| `bcrypt`                                       | `^5.1.1`   | Hash refreshTokenHash        |
| `rxjs`                                         | `^7.8.2`   | Reactive extensions          |
| `axios`                                        | `^1.16.0`  | HTTP client                  |
| `reflect-metadata`                             | `^0.2.0`   | Decorator metadata           |

**Dev dependencies BE:**

| Package                          | Version    |
| -------------------------------- | ---------- |
| `@nestjs/cli`                    | `^11.0.21` |
| `@nestjs/schematics`             | `^11.1.0`  |
| `@nestjs/testing`                | `^11.1.19` |
| `@types/cookie-parser`           | `^1.4.8`   |
| `@types/express`                 | `^4.17.17` |
| `@types/passport-google-oauth20` | `^2.0.16`  |
| `@types/passport-jwt`            | `^4.0.1`   |
| `@types/sanitize-html`           | `^2.16.1`  |
| `@types/bcrypt`                  | `^5.0.2`   |
| `tsc-alias`                      | `^1.8.17`  |
| `typescript`                     | `^5.1.3`   |
| `ts-node`                        | `^10.9.2`  |
| `ts-jest`                        | `^29.4.9`  |
| `jest`                           | `^29.5.0`  |
| `@faker-js/faker`                | `^10.4.0`  |
| `prettier`                       | `^3.0.0`   |
| `eslint`                         | `^8.42.0`  |

---

## 11. Media Upload — Cloudinary primary, local fallback

### Quy tắc

- **Mặc định**: BE upload buffer trực tiếp lên Cloudinary qua `cloudinary.uploader.upload_stream`. URL trả về là `https://res.cloudinary.com/<cloud>/image/upload/...` và lưu vào `Media.url`.
- **Fallback**: Khi Cloudinary throw lỗi (hết quota, sai key, network…), BE tự động ghi file xuống `be/uploads/<folder>/<uuid>.<ext>` rồi serve qua `app.useStaticAssets()` tại `/uploads/`. URL trả về có dạng `<API_URL>/uploads/<folder>/<filename>`.
- **DB persistence**: Sau mỗi upload thành công, BE phải tạo bản ghi `Media` gồm `url`, `publicId`, `folder`, `format`, `width`, `height`, `bytes`, `tags`, `uploadedBy`. Các bảng nghiệp vụ (`Product.images`, `Category.image`, `Banner.imageUrl`, `Post.ogImage`, `SiteConfig.brand.*`) chỉ lưu URL/metadata trả về từ BE.
- **Admin UX**: Tuyệt đối KHÔNG bắt admin paste URL. Mọi form ảnh dùng widget `<ImageUploader>` (drag & drop + click to browse + preview + remove) hoặc grid multi-image kèm `<input type="file">`. Paste URL thủ công không được là luồng chính và không được dùng để thay thế upload file.
- **Editor image upload**: Rich editor gọi cùng endpoint `POST /api/media/upload`; sau khi BE trả URL, editor mới insert `<img src="...">` vào nội dung. Không cho flow “admin tự dán URL ảnh” trong editor.
- **Permission**: `POST /api/media/upload` mở cho mọi user authenticated, nhưng:
  - `ADMIN`/`STAFF`: chọn `folder` tự do (categories, products, posts, banners, branding, vhdcorp).
  - `CUSTOMER`: bị ép `folder = "avatars"` ở controller (chống lạm dụng storage).

### `.env` BE (Cloudinary)

```env
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
CLOUDINARY_UPLOAD_PRESET=<upload_preset>
```

### Validation

- MIME type: `image/(jpeg|png|webp|gif|svg+xml)`
- Max size: 10MB (NestJS `MaxFileSizeValidator`)
- Multipart field name: `file`, optional field `folder`

---

## 12. Caching policy

**Quyết định**: Web KHÔNG cache (tránh bug stale data trong giai đoạn nghiệm thu).

- TanStack Query: `staleTime: 0`, `gcTime: 0`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true`.
- Next.js: tất cả route admin + client động dùng `export const dynamic = "force-dynamic"`. `fetch` không bật `next: { revalidate }`.
- BE: không bật Redis/in-memory cache cho query Prisma. Mỗi request hit DB.
- Admin builder: lưu draft → publish → public site lập tức thấy thay đổi (không có CDN tier ở giữa).

Khi muốn bật cache lại sau release: bật `revalidate` cho từng route public + thêm `staleTime` cho các query non-personal.

---

## 13. Acceptance Tests (UI-driven, từng feature)

Toàn bộ test phải chạy trực tiếp qua **browser UI** (Playwright), không curl-only. Mỗi flow ghi rõ: pre-condition, steps, expected, actual.

### Admin Auth

- [x] `/admin/login` email + password (no Google OAuth) → `Set-Cookie: access_token; HttpOnly`
- [x] Truy cập `/admin/dashboard` khi đã login → 200; chưa login → redirect `/admin/login`

### Admin Builder

- [x] DnD thêm section Hero/Featured/Banner/Posts… vào canvas
- [x] Reorder section qua nút Lên/Xuống → thứ tự cập nhật ngay
- [x] Toggle eye icon → section ẩn/hiện trên canvas, dấu `Chưa lưu` xuất hiện
- [x] Trash icon → xóa section
- [x] Ctrl+S → toast `Đã lưu nháp`
- [x] Xuất bản → toast `Đã xuất bản`, public `/` reflect trong < 1s
- [x] Mobile/Tablet/Desktop preview toggle
- [x] Chỉnh thuộc tính right panel (text, image, link)

### Admin CRUD

- [x] **Categories**: tạo / sửa / xóa kèm ảnh (ImageUploader)
- [x] **Posts**: editor Tiptap 17 toolbar buttons, bold/italic/H1-H3/list/quote/code/HR/link/image, ảnh cover (ImageUploader), SEO meta, status DRAFT/PUBLISHED, tags
- [x] **Products**: name/slug, RichEditor description, multi-image, SEO, status, category, price, stock
- [x] **Users**: đổi role ADMIN ↔ STAFF ↔ CUSTOMER → toast `Đã đổi vai trò → ...`
- [x] **Reviews**: list + duyệt/từ chối (page render đúng, empty state OK)
- [x] **Banners**: tạo + sửa (ImageUploader + URL fallback) + xóa
- [x] **Media library**: upload qua `<input type=file>` → `Đã tải N ảnh`; copy URL; xóa cascade Cloudinary
- [x] **Settings**: logo / favicon / OG image qua ImageUploader; brand colors; nav; footer; SEO defaults

### Client

- [x] `/login`: customer email/password → cookie set, redirect `/`
- [x] `/register`: validation, tạo CUSTOMER → auto login + redirect `/`
- [x] `/account/profile`: đổi tên, **upload avatar** (ép folder `avatars`)
- [x] `/account/password`: đổi mật khẩu (yêu cầu password hiện tại)
- [x] `/`: render đúng các section đã publish
- [x] `/products`, `/products/[slug]`: list + detail với JSON-LD Product + BreadcrumbList **không trùng lặp**
- [x] `/posts`, `/posts/[slug]`: list + detail
- [x] `/categories/[slug]`: filter theo category
- [x] `/search?q=`: trả về kết quả
- [x] `/contact`: submit form → toast `Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.`

### SEO chuẩn

- [x] Title / description / og:\* / twitter:card / canonical / robots present
- [x] JSON-LD: Product (id="ld-product"), BreadcrumbList (id="ld-breadcrumb"); chỉ render 1 lần mỗi loại (không duplicate)
- [x] Sitemap.xml + robots.txt phục vụ public

### Bugs đã fix trong vòng test

1. **Publish 400**: axios gửi `null` body → strict JSON parser reject. Fix: gửi `undefined`.
2. **Customer avatar 403**: `MediaController` gắn `@Roles(ADMIN,STAFF)` cấp class. Fix: tách per-method, mở `/upload` cho mọi user authenticated, ép `folder="avatars"` cho CUSTOMER.
3. **JSON-LD duplicate**: Product + Breadcrumb render cả ở SSR `page.tsx` lẫn client `product-detail-client.tsx`. Fix: client chỉ render khi có aggregateRating, dedupe bằng id.
4. **SiteConfig publish ghi đè partial value**: dùng rollback từ history snapshot.

### Vòng test 2 (production build)

- Build `yarn build` thành công, deploy lên `next start -p 3000`.
- **JSON-LD prod build verify**: tất cả pages SSR ra **đúng 1** script mỗi loại trong raw HTML và DOM:
  - `/` → `ld-org`, `ld-site`
  - `/products/[slug]` → `ld-product`, `ld-breadcrumb`
  - `/posts/[slug]` → `ld-article`, `ld-breadcrumb`
  - Lưu ý: trong dev mode (Turbopack + RSC streaming) DOM hiển thị 4 script do hydration replay; production build đã dedup sạch.
- **Bug fix #5**: Post detail JSON-LD duplicate — đã xóa `<JsonLd>` trong `post-detail-client.tsx`, SSR `page.tsx` là source duy nhất.
- Tất cả 9 admin pages render thành công sau prod deploy: products/posts/categories/users/banners/media/settings/builder/reviews.
- Builder save trong prod build: `Ctrl+S` → toast `Đã lưu nháp` ✓ (11 sections × 4 controls).
- Cloudinary backup key đã wire vào `be/.env`: `CLOUDINARY_API_KEY_BACKUP=832243178579144`.
