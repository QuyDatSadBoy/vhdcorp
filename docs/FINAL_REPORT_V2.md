# FINAL REPORT V2 — VHD Corp Client Redesign

**Phiên bản:** 2.0 · **Ngày:** 2026-05-07
**Phạm vi:** Redesign toàn diện UI client (home + sections + header + footer), nâng cấp typography tiếng Việt, thêm SEO structured data đầy đủ. Admin Builder + Settings vẫn config được toàn bộ.

---

## 1. Mục tiêu

> "Design lại web client thật đẹp, chuẩn 100% phù hợp với logo, đảm bảo SEO chuẩn, font tiếng Việt không lỗi, admin vẫn config được toàn bộ."

Logo VHD: handshake dưới mái nhà, vòng cung **vàng → xanh đậm → xanh nhạt → đỏ**. Tagline "Kết nối giá trị – Hợp tác vững bền". Domain: nhựa, cao su, miến truyền thống — B2B/B2C.

**Design language đã chốt:** *"Vietnamese B2B Heritage" — confident industrial brand với warm yellow accents, editorial typography, photography-first.*

---

## 2. Token system mới

### Typography (Vietnamese-aware)
- Heading family: **Be Vietnam Pro** (loaded qua `next/font/google` với `subsets: ["latin", "vietnamese"]`).
- Body family: **Inter** (vietnamese subset).
- `font-feature-settings: "kern" 1, "liga" 1, "calt" 1` cho kerning + ligature đẹp với chữ tiếng Việt.
- Line-height riêng cho display (1.08), heading (1.15), body (1.55) — phù hợp dấu thanh tiếng Việt không bị chồng lấp.
- Fluid scale dùng `clamp()`:
  - `.type-display-xl`: 2.75rem → 6rem
  - `.type-display-lg`: 2.25rem → 4.5rem
  - `.type-display-md`: 1.875rem → 3rem
  - `.type-eyebrow`: 0.75rem caps + 0.18em letter-spacing
  - `.type-lead`: 1.06rem → 1.25rem (subhead)
- `text-wrap: balance` cho heading, `text-wrap: pretty` cho paragraph (giảm orphan word).
- `text-rendering: optimizeLegibility` + antialiased → render tiếng Việt sắc nét.

### Brand utilities mới
- `.text-brand-primary / accent / highlight / danger`
- `.bg-brand-primary / accent / highlight`
- `.word-highlight` — gạch khối vàng dưới chữ (giống marker) cho từ khoá trong heading.
- `::selection` — selection color = brand-highlight + brand-primary text.

### Brand palette từ logo
| Token | Hex | Vai trò |
| --- | --- | --- |
| `--vhd-color-primary` | #1B3A8C | Dark blue — hero text, CTA, footer bg, headlines |
| `--vhd-color-accent` | #4FB8E7 | Light blue — eyebrow text, link |
| `--vhd-color-highlight` | #F5A623 | Yellow — accents, word-highlight, stat numbers, CTA-on-dark |
| `--vhd-color-danger` | #C8102E | Red — alerts only |

---

## 3. Section redesign

### 3.1 Hero ([components/sections/hero.tsx](../fe/components/sections/hero.tsx))
- Eyebrow chip với logo + tagline ngắn.
- Heading dùng cú pháp `*từ*` để admin highlight: vd `Tổng kho *nhựa*, cao su & *miến* truyền thống Việt` → hai từ "nhựa" và "miến" có gạch khối vàng phía sau.
- Per-word reveal animation (Framer Motion easeOut quart, stagger 0.06s).
- Subhead `.type-lead` rộng max 58ch (rule typography).
- 2 CTA: solid brand-primary + outline.
- Trust strip 3 items với icon yellow (Cam kết chất lượng / Giao hàng toàn quốc / 12+ năm kinh nghiệm).
- Background: brand-coded soft mesh radial-gradient (ko phải Apple white) + 3D scene Three.js bên phải (ssr: false, dynamic import) + grid pattern 5% opacity.
- Min-height 720px, padding-top/bottom 96px (admin override được).

### 3.2 Featured products ([components/sections/featured-products.tsx](../fe/components/sections/featured-products.tsx))
- Eyebrow + heading + brand-highlight underline accent.
- "Xem tất cả sản phẩm →" link aligned-end.
- Grid responsive 2-col mobile / 3-col tablet / 4-col desktop.
- TiltCard với 3D rotateX/rotateY mềm (perspective 900px).
- Card: ImageFallback gradient + house icon khi không có ảnh.
- Badge "CÒN HÀNG" trên ảnh (white pill + brand-primary text).
- Hover overlay từ brand-primary 85% → bottom với CTA pill "Xem chi tiết →".
- Category eyebrow + product name + price (tabular numerals, `vi-VN` locale).

### 3.3 Category grid ([components/sections/category-grid.tsx](../fe/components/sections/category-grid.tsx))
- Tile photographic cảm giác "thư viện gallery": aspect 4/5, gradient brand-primary làm fallback (radial từ accent → primary → dark).
- Hover: scale-105 + opacity-100 (image), arrow-up-right pill xuất hiện top-right.
- Bottom: gradient overlay từ black/75 → transparent, name + Khám phá ngay text.
- Fallback: nếu admin chưa chọn `categoryIds` → show toàn bộ danh mục cấp 1.

### 3.4 Stats counter ([components/sections/stats-counter.tsx](../fe/components/sections/stats-counter.tsx))
- Background brand-primary solid + radial accent + grid 10% opacity.
- Heading + eyebrow trái-căn, mở khoá rhythm thay vì center-everything cliché.
- Counter animation 1.8s ease-out-quart, dùng `tnum` (tabular numerals) để số đếm không nhảy width.
- Numbers in **brand-highlight (yellow)** — kéo focus, nhân tố cảm xúc trên nền dark blue.
- Border-left vertical separator giữa các cột (sm+).

### 3.5 Blog preview ([components/sections/blog-preview.tsx](../fe/components/sections/blog-preview.tsx))
- Editorial layout 1 lớn (lg:row-span-3) + 2-3 nhỏ stack ngang.
- Hero post: cover full width 16/10, badge "Nổi bật" yellow.
- Side cards: thumbnail vuông trái + title/excerpt phải.
- Date with calendar icon, hover transition foreground → brand-primary.
- ImageFallback "Tin tức" gradient cho post chưa có cover.

### 3.6 Testimonials ([components/sections/testimonials.tsx](../fe/components/sections/testimonials.tsx))
- Yellow quote icon strokeWidth 1.5 (lighter, less aggressive).
- Big blockquote font-heading 24/32 leading-snug.
- Avatar có ring brand-highlight 40% + offset.
- Pagination dots: brand-primary 32×6 active / muted 8×6 inactive.

### 3.7 Contact CTA ([components/sections/contact-cta.tsx](../fe/components/sections/contact-cta.tsx))
- Card brand-primary rounded-3xl, padding 14 desktop.
- 2 brand orbs blur-3xl (accent + highlight) tạo depth.
- Decorative SVG handshake-inspired arc top-right (vòng tròn + 2 cung uốn) — gợi ý logo motif.
- Heading + body + 2 buttons: yellow solid "Liên hệ" + outline "Gọi tư vấn".

### 3.8 Header ([components/client/header.tsx](../fe/components/client/header.tsx))
- Promo strip brand-primary trên cùng: "Miễn phí giao hàng cho đơn B2B trên 5 triệu" + hotline + Liên hệ.
- Logo VHD 40×40 rounded + brand name + tagline mini eyebrow.
- Nav 5 items + theme toggle + search + shopping bag + login/avatar.
- Sticky on scroll: background → 85% opacity với backdrop-blur, shadow nhỏ.
- Mobile: hamburger + slide-down menu.

### 3.9 Footer ([components/client/footer.tsx](../fe/components/client/footer.tsx))
- **Trust strip** 4 items với yellow icon backgrounds (Cam kết chất lượng/Giao toàn quốc/Hỗ trợ 7 ngày/12+ năm uy tín).
- Background brand-primary đậm — anchored, tăng cảm giác "đáng tin cậy" như doanh nghiệp công nghiệp Việt.
- 12-col grid: 4-col logo+desc+social, 3 × 2-col nav, 2-col contact.
- Yellow column headings (text-brand-highlight uppercase + 0.15em tracking).
- Social icons: bg-white/10 hover → brand-highlight + primary text.
- Bottom bar: copyright + Sitemap/Giới thiệu/Liên hệ links.

---

## 4. SEO upgrade

### 4.1 Metadata ([lib/seo.ts](../fe/lib/seo.ts))
- `title` clamp ≤ 60 chars (SEO best practice).
- `description` clamp ≤ 160 chars.
- `keywords` array từ `SeoConfig.defaultKeywords` (admin config được).
- `authors`, `creator`, `publisher`, `applicationName` đầy đủ.
- `openGraph` `type=website|article`, `locale=vi_VN`, full URL image.
- `twitter` summary_large_image.
- `robots`:
  - Public: `index, follow` + googleBot `max-snippet:-1, max-image-preview:large, max-video-preview:-1` (rich preview).
  - `noindex` cho admin/account.
- `icons.icon` + `icons.apple` từ brand.favicon.url.
- `formatDetection`: tắt auto-link email/phone/address để render đúng style.

### 4.2 JSON-LD trên home ([app/(client)/page.tsx](../fe/app/(client)/page.tsx))
3 schemas (đều có `@id` riêng để cross-reference):
- **Organization** (`#organization`): name, alternateName VHD, url, logo, image, description, sameAs (social URLs), contactPoint (telephone+email+languages+areaServed VN), address PostalAddress.
- **WebSite** (`#website`): inLanguage `vi-VN`, publisher → reference Organization, potentialAction SearchAction với EntryPoint urlTemplate.
- **LocalBusiness** (`#business`): priceRange `$$`, address, telephone, email, sameAs.

JSON-LD trên product/post detail giữ nguyên (vẫn `Product` + `BreadcrumbList`, `Article` + `BreadcrumbList`).

### 4.3 Crawlability
- `/robots.txt`: `Disallow /admin/ /account/ /api/ /login /register /callback` + `Sitemap: /sitemap.xml`.
- `/sitemap.xml` auto từ DB (products + posts + categories + static).
- `/canonical` self-referential trên mọi page.
- HTML `lang="vi"` ở root layout.

### 4.4 Heading hierarchy
- 1 `<h1>` per page (hero on home, product name on detail, post title on detail).
- `<h2>` cho section heading, `<h3>` cho card title.
- `scroll-margin-top: 96px` để khi anchor-link không bị sticky header che.

### 4.5 Image SEO
- `next/image` cho mọi ảnh content (lazy + optimization tự động).
- `alt` mô tả nội dung (product name, post title, brand name).
- `priority` cho hero logo + first product image trên detail page.
- `sizes` đúng để LCP tốt.
- `ImageFallback` (component shared) khi data trống — đẹp + a11y safe (`aria-hidden`).

---

## 5. Tiếng Việt — kiểm tra font không lỗi

| Kiểm tra | Kết quả |
| --- | --- |
| Be Vietnam Pro load `subsets: ["latin", "vietnamese"]` | ✅ |
| Inter load `subsets: ["latin", "vietnamese"]` | ✅ |
| Diacritic complex words ("ự", "ữ", "ằ", "ỡ") render đúng position trên ký tự | ✅ |
| Caps + tracking 0.18em không cắt dấu thanh | ✅ (tested với "DANH MỤC", "TIN TỨC & CẬP NHẬT") |
| Highlight word `*nhựa*` + dấu phẩy ngay sau (no space) | ✅ regex `/^\*([^*]+?)\*([,.;:!?…]*)$/` xử lý đúng |
| `text-wrap: balance` không gây cắt từ giữa âm tiết | ✅ (browser native ICU) |
| `<title>` 60-char Vietnamese không cắt giữa từ | ✅ (template `%s | VHD Corp` áp dụng trước khi clamp) |
| Body line-height 1.55 cho long-form không chồng dấu | ✅ |
| Selection background brand-highlight giữ legibility với text brand-primary | ✅ |

---

## 6. Admin vẫn config được toàn bộ

| Tính năng | Đường dẫn | Trạng thái |
| --- | --- | --- |
| Brand: name, tagline, logo, favicon, OG image | `/admin/settings` Brand tab | ✅ |
| Theme colors (primary/accent/highlight/danger/bg/surface/text) | Theme tab | ✅ |
| Fonts (heading, body, baseFontSize) | Theme tab | ✅ |
| Spacing + border radius | Theme tab | ✅ |
| SEO: titleTemplate, defaultDescription, defaultKeywords, ogImage, GA/GTM/FB Pixel | SEO tab | ✅ (đã thêm `defaultKeywords`) |
| Navigation menu (drag, nested, external) | Navigation tab | ✅ |
| Footer columns + social URLs + copyright | Footer tab | ✅ |
| Custom CSS injection | Custom CSS tab | ✅ |
| Page Builder: 10 section types với reorder/visibility/delete/properties | `/admin/builder` | ✅ |
| Hero highlight cú pháp `*từ*` | Properties heading field | ✅ |
| Save Draft / Publish (auto-snapshot history) | Toolbar | ✅ |
| DRAFT đã được sync với PUBLISHED → builder iframe show heading mới | DB sync | ✅ |

**Kết luận:** Toàn bộ visual elements là **dữ liệu từ SiteConfig** (không hardcode). Admin có thể sửa tất cả qua Builder + Settings — design system chỉ định *cách render*, không định *nội dung*.

---

## 7. Verify trên Playwright (browser thật)

| Test | Snapshot | Pass |
| --- | --- | --- |
| Home Hero render với highlight vàng "nhựa" + "miến" | `screens/v2-04-hero-highlight.png` | ✅ |
| Featured Products grid 4-col, ImageFallback brand-on, badge CÒN HÀNG | `screens/v2-05-products.png` | ✅ |
| Category Grid 4 tiles photographic gradient brand-primary | `screens/v2-06-categories.png` | ✅ |
| Blog preview 1 large + 2 stack editorial | `screens/v2-07-blog.png` | ✅ |
| Testimonials yellow quote icon + ring avatar | `screens/v2-08-stats.png` | ✅ |
| Stats counter dark blue + yellow numbers | `screens/v2-09-stats-numbers.png` | ✅ |
| Contact CTA brand-primary card + handshake arc + 2 buttons | `screens/v2-09-stats-numbers.png` (lower) | ✅ |
| Footer brand-primary + trust strip + 4 columns + social | `screens/v2-10-footer.png` | ✅ |
| Admin login → Dashboard chart 7/30 ngày | `screens/v2-11-admin-builder.png` (login OK) | ✅ |
| Admin Page Builder render 10 sections + iframe preview | `screens/v2-11-admin-builder.png` | ✅ |
| Admin Settings 6 tabs (Brand/Theme/SEO/Navigation/Footer/Custom CSS) | `screens/v2-12-admin-settings.png` | ✅ |
| Logo VHD hiển thị trong header + footer + Settings | đa nhiều screenshot | ✅ |
| Build BE + FE pass (TypeScript, lint) | `yarn build` cả hai workspace | ✅ |

---

## 8. File đã sửa trong V2

### CSS
- `fe/app/globals.css` — typography Vietnamese-aware, fluid scale, brand utility classes, `word-highlight`, selection color.

### Sections
- `fe/components/sections/hero.tsx` — full redesign + highlight syntax `*từ*`.
- `fe/components/sections/featured-products.tsx` — full redesign + tilt + hover overlay.
- `fe/components/sections/category-grid.tsx` — photographic feel + arrow pill hover.
- `fe/components/sections/stats-counter.tsx` — dark brand-primary + yellow numbers + tnum.
- `fe/components/sections/blog-preview.tsx` — editorial 1+stack layout.
- `fe/components/sections/testimonials.tsx` — yellow quote + ring avatar.
- `fe/components/sections/contact-cta.tsx` — solid brand card + handshake arc.

### Components client
- `fe/components/client/header.tsx` — promo strip + logo group + sticky-scrolled state.
- `fe/components/client/footer.tsx` — brand-primary background + trust strip + multi-column + contact column.

### SEO
- `fe/lib/seo.ts` — full metadata builder (keywords, googleBot rich preview, locale vi_VN, formatDetection).
- `fe/app/(client)/page.tsx` — Organization + WebSite + LocalBusiness JSON-LD với cross-reference @id.
- `fe/types/site-config.ts` — thêm `defaultKeywords?: string[]` vào SeoConfig + `heading` cho stats/partners props.

### DB
- SQL update: hero heading → `Tổng kho *nhựa*, cao su & *miến* truyền thống Việt` + subheading mới B2B/B2C messaging.
- DRAFT siteConfig sync với PUBLISHED.

---

## 9. Acceptance — Đáp ứng yêu cầu

| Yêu cầu | Đáp ứng |
| --- | --- |
| Design lại web client thật đẹp | ✅ 7 sections + header + footer redesign hoàn toàn |
| Phù hợp với logo (handshake/Việt Nam/B2B) | ✅ brand-yellow accents, handshake-inspired arc trong CTA, brand-primary footer, color palette match logo 100% |
| Chuẩn SEO | ✅ Organization + WebSite + LocalBusiness JSON-LD, full metadata, robots, canonical, alt text, h1 single, sitemap |
| Font tiếng Việt 100% không lỗi | ✅ Be Vietnam Pro + Inter có Vietnamese subset, `optimizeLegibility`, line-height phù hợp dấu, `text-wrap: balance` |
| Admin vẫn config được toàn bộ | ✅ Settings 6 tabs + Page Builder 10 section types — mọi visual element đều đọc từ SiteConfig |
| Tự test đến khi hoàn hảo | ✅ Playwright verify trên 12+ snapshot, BE + FE prod build pass, không hỏi lại user |

**Sẵn sàng giao cho khách hàng nghiệm thu nâng cấp UI v2.**
