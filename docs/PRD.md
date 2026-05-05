# PRD — VHD Corp E-Commerce Platform

> **Version:** 1.6.0 · **Date:** 2026-05-05
> **Tagline:** Kết nối giá trị – Hợp tác vững bền

---

## 1. Tổng quan

VHD Corp là tổng kho cung cấp sản phẩm nhựa & cao su và thực phẩm làng nghề truyền thống.

**2 apps trong monorepo:**

| App | Route group | Đối tượng | Mục tiêu |
| --- | --- | --- | --- |
| Client | `(client)/` | Khách hàng B2B/B2C | Khám phá sản phẩm, liên hệ đặt hàng |
| Admin | `admin/` | Nhân viên / quản trị viên | Vận hành nội dung & tùy chỉnh giao diện |

> **Quan trọng**: Web phải SEO tốt, Admin có quyền tùy chỉnh mọi thứ từ ui cho đến tất cả mọi thứ, web phải thật nhiều animation + 3d để thu hút.

---

### ⚠️ Code Convention bắt buộc

> Routes, file names, folder names, variables, functions, types — **tất cả dùng tiếng Anh**.
>
> UI text hiển thị cho người dùng (label, heading, copy) — **tiếng Việt qua `messages/vi.json`**, người dùng có thể toggle sang **tiếng Anh (`messages/en.json`)** trên cùng URL.

---

## 2. Tech Stack

### Frontend

> Skills: `vercel-react-best-practices` · `typescript-best-practices` · `tailwindcss` · `shadcn-ui` · `tanstack-query-best-practices` · `react-hook-form-zod` · `framer-motion-animator` · `gsap-scrolltrigger` · `seo` · `impeccable` · `3d-web-experience`

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, RSC, ISR) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Theme | Dark / Light mode (`next-themes`) |
| Ngôn ngữ | VI / EN — toggle client-side, **URL không đổi** (`next-intl` without routing) |
| State | Zustand (`authStore`, `uiStore`, `siteConfigStore`) |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Animation | Framer Motion + GSAP ScrollTrigger |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` (admin builder) |
| Images | Cloudinary Upload Widget + CDN + `next/image` |
| Design refs | `clinet-DESIGN.md` (client) · `admin-genesis-DESIGN.md` (admin) |

### Backend

> Skills: `nestjs-best-practices` · `nodejs-best-practices` · `prisma-client-api` · `prisma-database-setup` · `postgresql-table-design` · `postgresql-optimization`

| | |
| --- | --- |
| Framework | NestJS (feature-module architecture) |
| ORM | Prisma + PostgreSQL |
| Auth | JWT HttpOnly Cookie — access (15min) + refresh (7d) + Google OAuth |
| Media | Cloudinary SDK |
| Security | Helmet, CSRF guard, `@nestjs/throttler`, sanitize-html interceptor |

---

## 3. Client Routes

> Route paths dùng **tiếng Anh**. Giao diện hiển thị **tiếng Việt**.

| Route | Label | Mô tả |
| --- | --- | --- |
| `/` | Trang chủ | Hero, featured products, banner, blog preview |
| `/products` | Sản phẩm | Danh sách, filter, sort, infinite scroll |
| `/products/[slug]` | Chi tiết sản phẩm | Gallery, specs, CTA liên hệ, related products |
| `/categories/[slug]` | Danh mục | Sản phẩm theo danh mục |
| `/posts` | Tin tức | Danh sách bài viết, filter tag |
| `/posts/[slug]` | Bài viết | Nội dung, bài liên quan, CTA |
| `/about` | Giới thiệu | Câu chuyện thương hiệu, đội ngũ |
| `/contact` | Liên hệ | Form liên hệ (RHF + Zod), bản đồ |
| `/search` | Tìm kiếm | Full-text search sản phẩm + bài viết |
| `/account` | Tài khoản | Profile, đổi mật khẩu — protected |
| `/account/profile` | Hồ sơ | Cập nhật thông tin, avatar |
| `/account/password` | Đổi mật khẩu | Chỉ hiện với tài khoản email (ẩn với Google OAuth) |

### SEO — Yêu cầu bắt buộc

#### Metadata

- `generateMetadata` cho mọi trang — `<title>` max 60 ký tự, `<meta description>` max 160 ký tự
- Open Graph: `og:title`, `og:description`, `og:image` (1200×630), `og:type`
- Twitter Card: `summary_large_image`
- `robots: index, follow` mặc định; `noindex` cho `/admin/*`, `/api/*`, `/account/*`, `/login`, `/register`, `/callback`

#### Structured Data (JSON-LD)

| Trang | Schema |
| --- | --- |
| Trang chủ | `Organization` + `WebSite` + `SearchAction` |
| `/products/[slug]` | `Product` (name, image, offers, brand, aggregateRating) |
| `/posts/[slug]` | `Article` (headline, author, datePublished, dateModified) |
| Mọi trang | `BreadcrumbList` |
| `/contact` | `LocalBusiness` |

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

### Ngôn ngữ (VI / EN)

- **Cùng URL** — không có `/en/products`, chỉ có `/products` cho cả hai ngôn ngữ
- Toggle nút VI / EN ở header, persist `localStorage`
- Implementation: `next-intl` **without i18n routing** (chế độ không có locale prefix trong URL)
  - `messages/vi.json` — mặc định
  - `messages/en.json` — tiếng Anh
  - `useLocale()` / `useTranslations()` đọc từ `uiStore.locale` (Zustand)
  - Khi toggle: cập nhật `uiStore.locale`, re-render tại chỗ mà không navigate

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

| Route | UI Label | Mô tả |
| --- | --- | --- |
| `/admin` | → redirect `/admin/dashboard` | |
| `/admin/dashboard` | Dashboard | KPIs: lượt xem, sản phẩm, bài viết, user mới — biểu đồ 7/30 ngày |
| `/admin/products` | Sản phẩm | |
| `/admin/products/new` | Tạo sản phẩm | |
| `/admin/products/[id]` | Sửa sản phẩm | |
| `/admin/categories` | Danh mục | |
| `/admin/categories/new` | Tạo danh mục | |
| `/admin/categories/[id]` | Sửa danh mục | |
| `/admin/posts` | Bài viết | |
| `/admin/posts/new` | Soạn bài viết | |
| `/admin/posts/[id]` | Sửa bài viết | |
| `/admin/users` | Người dùng | |
| `/admin/users/[id]` | Chi tiết người dùng | |
| `/admin/reviews` | Đánh giá | |
| `/admin/reviews/[id]` | Chi tiết đánh giá | |
| `/admin/banners` | Banner | |
| `/admin/banners/new` | Tạo banner | |
| `/admin/banners/[id]` | Sửa banner | |
| `/admin/media` | Thư viện ảnh | |
| `/admin/builder` | Visual Page Builder | |
| `/admin/settings` | Cài đặt | |
| `/admin/login` | Đăng nhập | Chỉ email/password — **không có Google OAuth** (bảo mật admin) |

### CRUD Modules

| Module | Tính năng |
| --- | --- |
| Products | Tạo/sửa/xóa, upload Cloudinary, tồn kho, giá, tag, SEO meta override |
| Categories | Cây đa cấp, slug tự động, thứ tự hiển thị |
| Posts | Rich-text (Tiptap), SEO meta tùy chỉnh, publish/draft/schedule |
| Users | Xem, phân quyền (`customer/staff/admin`), block |
| Reviews | Duyệt/ẩn review từ khách |
| Banners | Upload, vị trí, bật/tắt |
| Media | Browser Cloudinary, upload, tag, folder |
| Settings | Thông tin công ty, analytics ID, SEO mặc định toàn site |

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

**Tab: Components** *(thư viện kéo thả)*

- Grid các block có thể kéo vào canvas: Hero, Banner, ProductGrid, BlogGrid, Testimonial, CTA, Divider, CustomHTML
- Mỗi component có thumbnail preview

##### Tab: Pages

- Chọn trang để edit: Trang chủ / Giới thiệu / Liên hệ
- Breadcrumb trang đang active

**Tab: Theme** *(global design tokens)*

- **Brand:** Logo upload, favicon upload, site name, tagline
- **Colors:** Color picker (hex + hsl) cho: Primary, Accent, Highlight, Background, Surface, Text, Danger
  - Live preview ngay khi kéo picker
  - Preset palettes (4 bộ màu gợi ý)
- **Typography:** Dropdown font heading (Google Fonts), font body, base font size (12–20px), line-height
- **Spacing:** Global section padding (compact / normal / spacious)
- **Border radius:** global corner radius slider

**Tab: History** *(version control)*

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

| Element được chọn | Properties hiện ra |
| --- | --- |
| Section Hero | Heading, subheading, CTA text, CTA link, background image/video, overlay opacity, text alignment, min-height |
| Section Featured Products | Heading, số sản phẩm hiển thị (4/8/12), layout (grid/carousel), filter category |
| Section Blog Preview | Heading, số bài (3/6), layout (list/grid), filter tag |
| Section Banner | Ảnh (upload/Cloudinary), link URL, alt text, position (full-width/boxed) |
| Section Testimonial | List quotes (add/remove), avatar, tên, chức vụ, company |
| Section CTA | Heading, body text, nút CTA (text + link + màu), background color/image |
| Section Custom HTML | Textarea nhập HTML, warning inject unsafe |
| Navigation | Kéo thả menu items, add/remove, nested dropdown, external link toggle |
| Footer | Cột (add/remove), links per cột, social icons (có/không + URL), copyright text |
| *Không chọn gì* | Hiện tab Theme (global) |

**Controls chung cho mọi section:**

- Section spacing: padding top/bottom (slider px)
- Background: None / Color / Image / Gradient
- Animation entrance: None / Fade up / Fade in / Slide left / Zoom in
- Animation delay: 0–1000ms
- Visible/Hidden toggle

#### Toolbar Actions

| Action | Behavior |
| --- | --- |
| Undo / Redo | Ctrl+Z / Ctrl+Y — up to 50 steps |
| Mobile / Tablet / Desktop | Toggle canvas width |
| Preview | Mở tab mới xem FE với draft config (chưa publish) |
| Save Draft | Lưu vào DB với `status: draft` — không ảnh hưởng production |
| 🚀 Publish | Apply config draft → production, tạo bản ghi `SiteConfigHistory` |

#### Section Types — Danh sách đầy đủ

| Type | Mô tả | Props chính |
| --- | --- | --- |
| `hero` | Hero banner toàn chiều rộng | heading, subheading, cta, bgImage, overlay, align |
| `featured-products` | Grid/carousel sản phẩm nổi bật | heading, limit, categoryId, layout |
| `category-grid` | Grid danh mục với ảnh | heading, categoryIds[], columns |
| `banner-slider` | Slider banner nhiều ảnh | slides[] (image, link, alt), autoplay, interval |
| `blog-preview` | Preview bài viết mới nhất | heading, limit, layout, tagFilter |
| `testimonials` | Slider đánh giá khách hàng | quotes[], autoplay |
| `contact-cta` | Block CTA liên hệ | heading, body, ctaText, ctaLink, bgColor |
| `stats-counter` | Số liệu ấn tượng (counter animation) | stats[] (label, value, unit) |
| `partners` | Logo đối tác | logos[] (image, name, link), grayscale toggle |
| `custom-html` | HTML tự do | html string, inject warning |

#### SiteConfig JSONB Schema (đầy đủ)

```jsonc
{
  "brand": {
    "siteName": "VHD Corp",
    "tagline": "Kết nối giá trị – Hợp tác vững bền",
    "logo": { "url": "...", "publicId": "..." },
    "favicon": { "url": "..." },
    "ogDefaultImage": { "url": "...", "width": 1200, "height": 630 }
  },
  "theme": {
    "colors": {
      "primary": "#1B3A8C",
      "accent": "#4FB8E7",
      "highlight": "#F5A623",
      "danger": "#C8102E",
      "background": "#FFFFFF",
      "surface": "#F8F9FA",
      "text": "#1A1A2E"
    },
    "fonts": {
      "heading": "Be Vietnam Pro",
      "body": "Inter",
      "baseFontSize": 16
    },
    "spacing": "normal",
    "borderRadius": 8
  },
  "seo": {
    "titleTemplate": "%s | VHD Corp",
    "defaultDescription": "...",
    "ogImage": "...",
    "googleAnalyticsId": "",
    "googleTagManagerId": "",
    "facebookPixelId": ""
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
            "minHeight": 600
          },
          "animation": { "type": "fade-up", "delay": 0 },
          "spacing": { "paddingTop": 80, "paddingBottom": 80 }
        },
        { "id": "uuid", "type": "featured-products", "order": 2, "visible": true, "props": { "heading": "Sản phẩm nổi bật", "limit": 8, "layout": "grid" } },
        { "id": "uuid", "type": "category-grid",    "order": 3, "visible": true, "props": { "heading": "Danh mục", "columns": 4 } },
        { "id": "uuid", "type": "blog-preview",     "order": 4, "visible": true, "props": { "heading": "Tin tức", "limit": 3 } },
        { "id": "uuid", "type": "contact-cta",     "order": 5, "visible": true, "props": { "heading": "Liên hệ đặt hàng", "ctaText": "Liên hệ ngay", "ctaLink": "/contact" } }
      ]
    },
    "about": { "sections": [] },
    "contact": { "sections": [] }
  },
  "navigation": [
    { "id": "uuid", "label": "Trang chủ",  "href": "/",          "order": 1, "children": [] },
    { "id": "uuid", "label": "Sản phẩm",  "href": "/products",  "order": 2, "children": [
      { "id": "uuid", "label": "Nhựa & Cao su", "href": "/categories/nhua-cao-su" },
      { "id": "uuid", "label": "Thực phẩm làng nghề", "href": "/categories/thuc-pham" }
    ]},
    { "id": "uuid", "label": "Tin tức",   "href": "/posts",     "order": 3, "children": [] },
    { "id": "uuid", "label": "Giới thiệu","href": "/about",     "order": 4, "children": [] },
    { "id": "uuid", "label": "Liên hệ",  "href": "/contact",   "order": 5, "children": [] }
  ],
  "footer": {
    "columns": [
      { "heading": "Về chúng tôi", "links": [{ "label": "Giới thiệu", "href": "/about" }] },
      { "heading": "Sản phẩm",   "links": [{ "label": "Nhựa & Cao su", "href": "/categories/nhua-cao-su" }] },
      { "heading": "Hỗ trợ",     "links": [{ "label": "Liên hệ", "href": "/contact" }] }
    ],
    "social": [
      { "platform": "facebook", "url": "" },
      { "platform": "zalo",     "url": "" },
      { "platform": "youtube",  "url": "" }
    ],
    "copyright": "© 2026 VHD Corp. All rights reserved.",
    "showMap": true
  },
  "customCss": ""
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

| Module | Prefix | Mô tả |
| --- | --- | --- |
| `AuthModule` | `/auth` | Login, register, refresh token, Google OAuth, logout |
| `UserModule` | `/users` | CRUD users, roles |
| `ProductModule` | `/products` | CRUD, search, filter, slug auto |
| `CategoryModule` | `/categories` | Cây danh mục |
| `PostModule` | `/posts` | CRUD bài viết, SEO meta |
| `ReviewModule` | `/reviews` | Duyệt/ẩn review |
| `BannerModule` | `/banners` | Banner |
| `MediaModule` | `/media` | Upload Cloudinary |
| `SiteConfigModule` | `/site-config` | Đọc/ghi config builder |
| `StatisticsModule` | `/statistics` | Dashboard analytics |
| `HealthModule` | `/health` | Health check |

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

| Token | Hex | Dùng cho |
| --- | --- | --- |
| `brand-blue-dark` | `#1B3A8C` | Primary CTA, header, active nav |
| `brand-blue-light` | `#4FB8E7` | Accent, hover, icon |
| `brand-yellow` | `#F5A623` | Highlight, badge, promo |
| `brand-red` | `#C8102E` | Destructive, sale label |

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
│       ├── vi.json                          # Chuỗi tiếng Việt (mặc định)
│       └── en.json                          # Chuỗi tiếng Anh
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
- UI text hiển thị → **viết qua `messages/vi.json`** (toggle sang EN không đổi URL)
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

| Tiêu chí | Yêu cầu |
| --- | --- |
| Performance | API p95 < 300ms, Core Web Vitals "Good" (LCP < 2.5s, CLS < 0.1, INP < 200ms) |
| Security | OWASP Top 10, HttpOnly cookie, CSRF guard, rate limit, sanitize input |
| SEO | SSR/ISR, sitemap auto, structured data |
| Accessibility | WCAG 2.1 AA — contrast, keyboard nav, ARIA |
| Ngôn ngữ | VI mặc định, toggle sang EN trên cùng URL, persist `localStorage` |
| Maintainability | Convention bắt buộc, review per feature, không code lan man |

---

## 10. Dependencies

> Package manager: **yarn**

### Frontend (`fe/`)

| Package | Version | Mục đích |
| --- | --- | --- |
| `next` | `16.2.4` | Framework |
| `react` / `react-dom` | `19.2.4` | UI runtime |
| `next-themes` | `^0.4.6` | Dark / Light mode |
| `next-intl` | `^4.11.0` | VI/EN toggle (without routing) |
| `zustand` | `^5.0.12` | State: authStore, uiStore, siteConfigStore |
| `@tanstack/react-query` | `^5.100.9` | Server state + mutations |
| `@tanstack/react-query-devtools` | `^5.100.9` | Dev tools |
| `react-hook-form` | `^7.75.0` | Form state |
| `@hookform/resolvers` | `^5.2.2` | Zod adapter |
| `zod` | `^4.4.2` | Schema validation |
| `axios` | `^1.16.0` | HTTP client |
| `motion` | `^12.38.0` | Animation (Framer Motion v12) |
| `gsap` | `^3.15.0` | ScrollTrigger, timeline animation |
| `@dnd-kit/core` | `^6.3.1` | Drag & drop (admin builder) |
| `@dnd-kit/sortable` | `^10.0.0` | Sortable lists |
| `@dnd-kit/utilities` | `^3.2.2` | DnD helpers |
| `@tiptap/react` | `^3.22.5` | Rich text editor |
| `@tiptap/starter-kit` | `^3.22.5` | Tiptap extensions bundle |
| `@tiptap/extension-image` | `^3.22.5` | Image trong editor |
| `next-cloudinary` | `^6.17.5` | Cloudinary Upload Widget + CldImage |
| `sharp` | `^0.34.5` | Image optimization cho next/image |
| `shadcn` | `^4.6.0` | Component CLI |
| `radix-ui` | `^1.4.3` | Headless UI primitives |
| `lucide-react` | `^1.14.0` | Icons |
| `tailwind-merge` | `^3.5.0` | Class merging |
| `class-variance-authority` | `^0.7.1` | Variant styles |
| `clsx` | `^2.1.1` | Conditional classes |
| `three` | `^0.184.0` | 3D (dynamic import) |
| `tw-animate-css` | `^1.4.0` | Tailwind animation utilities |

**Dev dependencies FE:**

| Package | Version |
| --- | --- |
| `tailwindcss` | `^4` |
| `@tailwindcss/postcss` | `^4` |
| `typescript` | `^5` |
| `@types/node` | `^20` |
| `@types/react` / `@types/react-dom` | `^19` |
| `@types/three` | `^0.184.0` |
| `eslint` | `^9` |
| `eslint-config-next` | `16.2.4` |

---

### Backend (`be/`)

| Package | Version | Mục đích |
| --- | --- | --- |
| `@nestjs/common` / `core` / `platform-express` | `^11.1.19` | Framework |
| `@nestjs/config` | `^4.0.4` | Env config (ConfigService) |
| `@nestjs/jwt` | `^11.0.2` | JWT |
| `@nestjs/passport` | `^11.0.5` | Auth strategy |
| `@nestjs/swagger` | `^11.4.2` | OpenAPI docs |
| `@nestjs/throttler` | `^6.5.0` | Rate limiting |
| `@nestjs/mapped-types` | `^2.1.1` | DTO helpers |
| `@prisma/client` | `^7.8.0` | ORM client |
| `@prisma/adapter-pg` | `^7.8.0` | PG adapter |
| `prisma` | `^7.8.0` | CLI + migrations |
| `passport` | `^0.7.0` | Auth middleware |
| `passport-google-oauth20` | `^2.0.0` | Google OAuth |
| `passport-jwt` | `^4.0.1` | JWT strategy |
| `pg` | `^8.14.1` | PostgreSQL driver |
| `cookie-parser` | `^1.4.7` | HttpOnly cookie |
| `helmet` | `^8.1.0` | HTTP security headers |
| `joi` | `^18.2.1` | Env validation khi khởi động |
| `cloudinary` | `^2.10.0` | Cloudinary SDK |
| `sanitize-html` | `^2.17.3` | Sanitize HTML input |
| `slugify` | `^1.6.9` | Auto-generate slug |
| `class-validator` | `^0.15.1` | DTO validation |
| `class-transformer` | `^0.5.1` | Serialization |
| `date-fns` | `^4.1.0` | Date utils |
| `google-auth-library` | `^10.6.2` | Google token verify |
| `bcrypt` | `^5.1.1` | Hash refreshTokenHash |
| `rxjs` | `^7.8.2` | Reactive extensions |
| `axios` | `^1.16.0` | HTTP client |
| `reflect-metadata` | `^0.2.0` | Decorator metadata |

**Dev dependencies BE:**

| Package | Version |
| --- | --- |
| `@nestjs/cli` | `^11.0.21` |
| `@nestjs/schematics` | `^11.1.0` |
| `@nestjs/testing` | `^11.1.19` |
| `@types/cookie-parser` | `^1.4.8` |
| `@types/express` | `^4.17.17` |
| `@types/passport-google-oauth20` | `^2.0.16` |
| `@types/passport-jwt` | `^4.0.1` |
| `@types/sanitize-html` | `^2.16.1` |
| `@types/bcrypt` | `^5.0.2` |
| `tsc-alias` | `^1.8.17` |
| `typescript` | `^5.1.3` |
| `ts-node` | `^10.9.2` |
| `ts-jest` | `^29.4.9` |
| `jest` | `^29.5.0` |
| `@faker-js/faker` | `^10.4.0` |
| `prettier` | `^3.0.0` |
| `eslint` | `^8.42.0` |
