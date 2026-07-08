# VHD Corp — Báo cáo bàn giao round 6 (audit toàn diện)

Ngày: 2026-05-19 · Phiên kế tiếp sau FINAL_REPORT_V5

## Phạm vi đã thực thi

1. **Backend smoke test toàn bộ admin** (yêu cầu: "test back end tất cả các màn nhé đặc biệt là màn banner, page builder, cài đặt site")
2. **SEO 100% bằng thư viện kiểm thử** (yêu cầu: "phải hợp với seo 100% nữa dùng thêm thư viện để check")
3. **Audit màu sắc** (yêu cầu: "cái nào màu mè không hợp với logo và màu sắc thì sửa lại hết")
4. **Admin dark/light mode** (yêu cầu: "trang admin cũng phải chỉnh được dark mode và light mode")
5. **Chart đẹp + chi tiết** (yêu cầu: "chart phải siêu đẹp và chi tiết")

## Kết quả Lighthouse (thư viện chuẩn Google)

| Trang             | SEO              | A11y       | BP  | Notes                                  |
| ----------------- | ---------------- | ---------- | --- | -------------------------------------- |
| `/`               | **100**          | **100**    | 96  | Hoàn hảo                               |
| `/products`       | **100**          | 96 (89→96) | 96  | Thêm aria-label cho Select + h2 hidden |
| `/products/:slug` | **100** (92→100) | 93         | 96  | Thêm fallback meta description         |
| `/posts/:slug`    | **100**          | 96         | 96  | Thêm fallback meta description         |

Thư viện: `lighthouse@latest` cài qua `yarn add -D` ở [fe/package.json](fe/package.json). Báo cáo JSON ở [fe/logs/lighthouse/](fe/logs/lighthouse/).

## File đã sửa (round 6)

### SEO

- [fe/app/(client)/products/[slug]/page.tsx](<fe/app/(client)/products/%5Bslug%5D/page.tsx#L19-L25>) — fallback meta description khi sản phẩm thiếu `metaDesc/shortDescription/description`.
- [fe/app/(client)/posts/[slug]/page.tsx](<fe/app/(client)/posts/%5Bslug%5D/page.tsx#L18-L20>) — fallback meta description cho bài viết.

### A11y / contrast (WCAG AA)

- [fe/app/(client)/products/page.tsx](<fe/app/(client)/products/page.tsx#L63-L84>) — thêm `aria-label` cho 2 Select (Lọc danh mục, Sắp xếp) + `<h2 className="sr-only">Danh sách sản phẩm</h2>` để giữ heading order h1→h2→h3.
- [fe/components/client/page-hero.tsx](fe/components/client/page-hero.tsx#L41-L61) — breadcrumb đổi `text-foreground/55` → `/75` (đạt AA 4.5:1); eyebrow đổi `text-brand-accent` → `text-brand-primary` (navy đậm trên nền sáng).
- [fe/components/client/header.tsx](fe/components/client/header.tsx#L75-L78) — bỏ `aria-label` trùng lặp + dùng `alt=""` cho logo (decorative, brand name đã có trong text bên cạnh) — fix `label-content-name-mismatch`.
- Bulk replace toàn bộ `type-eyebrow text-brand-accent` → `type-eyebrow text-brand-primary` ở [app/(client)/about/page.tsx](fe/app/%28client%29/about/page.tsx), [products/[slug]/product-detail-client.tsx](fe/app/%28client%29/products/%5Bslug%5D/_components/product-detail-client.tsx), [posts/[slug]/post-detail-client.tsx](fe/app/%28client%29/posts/%5Bslug%5D/_components/post-detail-client.tsx), [sections/partners.tsx](fe/components/sections/partners.tsx).

## Backend — đã kiểm thử

### 10 GET endpoint admin (đều 200)

```
GET /api/banners                              → 1182B
GET /api/banners/admin                        → ✅
GET /api/site-config                          → 6520B (8 keys: _qa, seo, brand, pages, theme, footer, customCss, navigation)
GET /api/site-config/draft                    → ✅
GET /api/site-config/history                  → 182559B
GET /api/reviews/admin                        → ✅
GET /api/statistics/overview                  → ✅
GET /api/statistics/timeseries?range=7        → ✅
GET /api/statistics/categories-breakdown      → ✅
GET /api/statistics/top-products?limit=6      → ✅
```

### CRUD đầy đủ

| Endpoint                   | Method | Status  | Ghi chú                                                             |
| -------------------------- | ------ | ------- | ------------------------------------------------------------------- |
| `/api/banners`             | POST   | **201** | DTO: `imageUrl`, `position` (≤60), `alt`, `active`, `order`, `link` |
| `/api/banners/:id`         | PUT    | **200** | FE dùng `axios.put` → khớp                                          |
| `/api/banners/:id`         | DELETE | **200** | Hard delete (Banner không có `deletedAt`)                           |
| `/api/site-config/draft`   | PUT    | **200** | Body: `{value: {...}}` — replace toàn bộ value                      |
| `/api/site-config/publish` | POST   | **201** | Promote draft → published, tạo history entry                        |

### Page Builder — kiến trúc phát hiện

Builder pages **không có endpoint riêng** (`/api/pages` → 404). Pages lưu **bên trong** `site-config.value.pages` (JSONB). FE service [fe/services/site-config.service.ts](fe/services/site-config.service.ts) xác nhận: builder dùng `PUT /draft` + `POST /publish` để lưu/xuất bản trang.

## Audit màu sắc — KHÔNG vi phạm brand

Scan toàn bộ `components/client`, `components/admin`, `app/(client)`, `app/admin`:

- Off-brand `bg-(red|pink|purple|fuchsia|violet|yellow|orange)-[345678]00`: **3 instances**, đều là semantic error/status (REJECTED status badge, hết hàng warning) — đúng convention UI.
- Hex hardcode: chỉ còn các màu **chính thức của thương hiệu bên ngoài**:
  - Google logo: `#FFC107 / #FF3D00 / #4CAF50 / #1976D2` (bắt buộc theo brand guideline Google)
  - Messenger: `#0084ff`, Zalo: `#0068ff`
  - Chart palette: 8 màu hài hòa
- Token `bg-brand-primary` (#1B3A8C navy), `bg-brand-accent` (#4FB8E7 cyan), `bg-brand-highlight` (#F5A623 amber) — dùng nhất quán.

## Admin Dark/Light mode

- [fe/components/admin/sidebar.tsx](fe/components/admin/sidebar.tsx) — thêm `<ThemeToggle />` (next-themes Moon/Sun) trong user card.
- Verified visually: Dashboard + Settings render đúng cả 2 mode.

## Dashboard charts — 4 KPI + 5 chart chính

- 4 KPI cards (Doanh thu / Đơn hàng / Danh mục / Lượt xem) cùng `h=180`, mỗi card 1 sparkline SVG (area / line / bars / line).
- Bar mới `MiniBars` (recharts BarChart + linearGradient emerald) cho card Danh mục.
- Charts chính: AreaChart doanh thu, BarChart đơn hàng, PieChart phân bố, BarChart top sản phẩm, LineChart traffic.

## Verified visually + functionally trước round 6

- 9/9 SVG chart render ✅
- All admin CRUD (products/posts/categories/users/reviews/banners/media/settings/builder) ✅
- TipTap 17 tools ✅
- Sitemap 31 URLs, robots.txt, JSON-LD ✅
- Google OAuth client (admin chỉ email/password) ✅
- Logo "VHD Corp" + domain `contact@vhdcorp.vn` ✅

## Tài khoản test

| Vai trò  | Email               | Password   | Đường dẫn login            |
| -------- | ------------------- | ---------- | -------------------------- |
| Admin    | `admin@vhdcorp.vn`  | `admin123` | `/admin/login`             |
| Customer | tạo qua `/register` | —          | `/login` (có Google OAuth) |

Seed: [be/prisma/seed.ts](be/prisma/seed.ts#L20-L21)

## Đánh giá tổng thể

- **Tính năng admin tùy chỉnh**: 100% xác minh (Settings 6 tabs, Builder 13 sections, Banner CRUD, Reviews moderate, Media library).
- **SEO**: Lighthouse 100/100 trên tất cả các route chính.
- **Brand compliance**: 100% màu logo/token, không có màu lạc lõng.
- **A11y**: 93-100 WCAG AA trên client.
- **Dark/Light**: cả admin lẫn client đều có toggle.

## Performance dev mode

Dev mode Lighthouse Performance 32-69 do HMR + dev bundles không tối ưu. Production build sẽ cải thiện đáng kể (giữ nguyên bundle splitter Next.js 16 + Turbopack). Khuyến nghị: chạy `yarn build && yarn start` rồi audit lại trước khi production launch.
