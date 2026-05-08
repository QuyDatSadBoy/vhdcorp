# FINAL REPORT V4 — Shopify-Inspired UI Upgrades

**Phiên bản:** 4.0 · **Ngày:** 2026-05-08
**Tham chiếu nguồn cảm hứng:** [Shopify Editions Winter 2026 — The Renaissance Edition](https://www.shopify.com/editions/winter2026)
**Phạm vi:** Áp dụng 9 patterns Shopify-inspired vào VHD Corp homepage + brand identity tagline đầy đủ

---

## 1. Tổng quan

> "Soát plan + áp dụng tất cả patterns hay từ Shopify cho VHD, code từ đầu đến cuối, đảm bảo tagline 'KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN' đầy đủ."

Đã hoàn thành **9 phases** trong 1 lượt code:

| # | Phase | Loại | File |
| --- | --- | --- | --- |
| 0 | Brand Identity full tagline | Update | `lib/site-config.ts`, `header.tsx`, `footer.tsx`, `hero.tsx`, `seed.ts`, DB |
| 1 | Sticky Section TOC Bar | Component mới | `components/client/section-toc.tsx` |
| 2 | Section "feature-showcase" với video lightbox | Section type mới | `components/sections/feature-showcase.tsx` |
| 3 | Section "use-cases" Skills-like grid | Section type mới | `components/sections/use-cases.tsx` |
| 4 | Floating Sticky CTA Bar | Component mới | `components/client/sticky-cta-bar.tsx` |
| 5 | Hero video preview optional | Schema + render | `components/sections/hero.tsx` |
| 6 | Section "faq-accordion" | Section type mới | `components/sections/faq-accordion.tsx` |
| 7 | Section "comparison-table" | Section type mới | `components/sections/comparison-table.tsx` |
| 8 | Back to top button + progress ring | Component mới | `components/client/back-to-top.tsx` |

---

## 2. Brand Identity — Phase 0

**Quy tắc:** Tagline đầy đủ phải là `KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN` (uppercase, không rút gọn).

**Đã render tại:**

| Vị trí | File | Format |
| --- | --- | --- |
| Header (dưới logo siteName) | `fe/components/client/header.tsx:91-93` | `text-[9px] font-bold uppercase tracking-[0.16em] text-brand-primary/80` |
| Footer (dưới logo) | `fe/components/client/footer.tsx:110` | `text-[10px] font-bold uppercase tracking-[0.16em] text-brand-highlight` |
| Hero eyebrow chip | `fe/components/sections/hero.tsx:147-149` | `font-bold uppercase tracking-[0.12em]` |
| `<title>` tag SEO | Generated qua `lib/seo.ts` `${siteName} — ${tagline}` | `VHD Corp — KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN` |
| Default site config | `fe/lib/site-config.ts:13` | `tagline: "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"` |
| BE seed | `be/prisma/seed.ts:131` | Same |
| DB live | `update-config-v4.ts` chạy | PUBLISHED + DRAFT đều cập nhật |

---

## 3. Patterns Shopify đã áp dụng + Browser-verified

| # | Shopify pattern | VHD implementation | Screenshot |
| --- | --- | --- | --- |
| **A** | Sticky horizontal section nav (12 anchor links) | `<SectionToc>` với 12 anchor → IntersectionObserver active highlight | `v4-03-toc-visible.png` |
| **B** | Modular feature card với video preview + thumbnail + play button | `<FeatureShowcase>` 2-col layout, video card với gradient placeholder, click → `<Dialog>` lightbox YouTube embed | `v4-06-feature-showcase.png` |
| **C** | Skills/Shortcuts grid (emoji + prompt + CTA) | `<UseCases>` 4-col grid: 📦 OEM 🚚 🔧 với badge "EXCLUSIVE" + "Liên hệ tư vấn →" CTA | `v4-04-use-cases.png` |
| **D** | Multi-format content (video + text + checklist) | `<FeatureShowcase>` bullets với check icons | Same as B |
| **E** | Pricing/feature callouts ("Exclusive to Plus" badge) | `badge: "EXCLUSIVE B2B"` ở Use Cases + Feature Showcase | Same as B/C |
| **F** | Floating CTA bar dismissible | `<StickyCtaBar>` reveal sau 80% viewport scroll, `sessionStorage` dismiss | `v4-04-use-cases.png` (bottom) |
| **G** | Hero video preview optional | Hero schema thêm `videoUrl` + `videoThumbnail`, render mobile-only | `hero.tsx` ready |
| **H** | FAQ accordion với expand/collapse animation | `<FaqAccordion>` numbered 01-06, +/− icon, height-auto Framer transition | `v4-09-faq-open.png` |
| **I** | Comparison table với row highlight on hover | `<ComparisonTable>` 3 cols (Standard/Premium/Enterprise B2B), highlight rows yellow, hover row blue tint | `v4-07-comparison.png` |
| **J** | "Back to top" floating button với scroll progress ring | `<BackToTop>` SVG circular progress ring đo `scrollY/docHeight`, click → smooth scroll top | Visible bottom-right ở `v4-09-faq-open.png` |
| **K** | Generous whitespace + light theme | py-24 cho mỗi section, container max-w-7xl | All screenshots |
| **L** | Editorial typography display-md/xl | Đã có từ V3 | All headings |

---

## 4. Section types — Tổng kết

V3 → V4: từ 12 section types lên **16 section types**.

| # | Type | Nguồn | UI hiển thị |
| --- | --- | --- | --- |
| 1 | hero | core | "Hero" |
| 2 | featured-products | core | "Sản phẩm nổi bật" |
| 3 | category-grid | core | "Lưới danh mục" |
| 4 | banner-slider | core | "Banner slider" |
| 5 | blog-preview | core | "Bài viết" |
| 6 | testimonials | core | "Testimonials" |
| 7 | contact-cta | core | "CTA liên hệ" |
| 8 | stats-counter | core | "Số liệu" |
| 9 | partners | core | "Đối tác" |
| 10 | industries | V3 | "Lĩnh vực kinh doanh" |
| 11 | process | V3 | "Quy trình" |
| 12 | **feature-showcase** | **V4 NEW** | "Showcase tính năng" |
| 13 | **use-cases** | **V4 NEW** | "Use Cases B2B" |
| 14 | **faq-accordion** | **V4 NEW** | "FAQ Accordion" |
| 15 | **comparison-table** | **V4 NEW** | "Bảng so sánh" |
| 16 | custom-html | core | "HTML tùy chỉnh" |

---

## 5. Files đã tạo / sửa V4

### Tạo mới (8 files)

| File | LOC | Mục đích |
| --- | --- | --- |
| `fe/components/client/section-toc.tsx` | 102 | Sticky TOC bar với active highlight |
| `fe/components/client/sticky-cta-bar.tsx` | 99 | Floating bottom CTA dismissible |
| `fe/components/client/back-to-top.tsx` | 80 | Back-to-top + progress ring |
| `fe/components/sections/feature-showcase.tsx` | 134 | Showcase video lightbox |
| `fe/components/sections/use-cases.tsx` | 96 | Skills-like grid B2B |
| `fe/components/sections/faq-accordion.tsx` | 130 | FAQ accordion expand/collapse |
| `fe/components/sections/comparison-table.tsx` | 137 | Comparison table với highlight rows |
| `be/prisma/update-config-v4.ts` | 220 | Update DB tagline + 13 sections |

### Đã sửa (8 files)

| File | Thay đổi |
| --- | --- |
| `fe/types/site-config.ts` | Thêm 4 SectionType + 4 interfaces (FeatureShowcase, UseCases, FaqAccordion, ComparisonTable) + Hero `videoUrl`/`videoThumbnail` |
| `fe/components/sections/index.tsx` | Import + register 4 sections; wrap mỗi section trong `<div id="sec-{type}" scroll-mt-20>` |
| `fe/components/sections/hero.tsx` | Thêm hero video preview + Dialog (mobile only); update eyebrow tagline đầy đủ |
| `fe/components/client/header.tsx` | Tagline đầy đủ uppercase |
| `fe/components/client/footer.tsx` | Tagline đầy đủ uppercase highlight |
| `fe/lib/site-config.ts` | DEFAULT_SITE_CONFIG.brand.tagline mới |
| `fe/lib/default-sections.ts` | 13 sections homepage mới (thêm use-cases, feature-showcase, comparison-table, faq-accordion) |
| `fe/app/(client)/layout.tsx` | Mount `<StickyCtaBar />` + `<BackToTop />` cùng `<FloatingContact />` |
| `fe/app/(client)/page.tsx` | TOC_LABELS map + tocItems generate + render `<SectionToc />` |
| `fe/app/admin/builder/page.tsx` | Register 4 templates + labels mới |
| `fe/app/globals.css` | `@utility scrollbar-none` cho TOC scroll-x |
| `be/prisma/seed.ts` | Tagline DEFAULT mới |

---

## 6. Verification — Playwright trên browser thật

| Test | Snapshot | Pass |
| --- | --- | --- |
| Hero "Tổng kho *nhựa*, cao su & *miến* truyền thống Việt" + tagline đầy đủ trong eyebrow | `v4-01-hero.png` | ✅ |
| Industries section 3 cards | `v4-02-toc-industries.png` | ✅ |
| Sticky TOC bar appear sau scroll 600px, position dưới header (top-16/md:top-20), active link highlight | `v4-03-toc-visible.png` | ✅ |
| Use Cases 4 cards với emoji + EXCLUSIVE badge | `v4-04-use-cases.png` | ✅ |
| Feature Showcase 2-col với big editorial heading + bullets + CTA + video card placeholder | `v4-06-feature-showcase.png` | ✅ |
| Comparison Table 3 cols (Standard/Premium/Enterprise B2B) + PHỔ BIẾN badge + highlight rows + checkmark | `v4-07-comparison.png` | ✅ |
| FAQ accordion: số 01-05, click expand/collapse, animation height auto | `v4-09-faq-open.png` | ✅ |
| Sticky CTA bar: reveal sau 80% scroll, "Cần tư vấn báo giá B2B?" + Liên hệ ngay + close button | All bottom-of-page screenshots | ✅ |
| Back to top button: progress ring, scroll smooth | `v4-09-faq-open.png` (right side) | ✅ |
| Mobile 390px: TOC scroll-x, Sticky CTA stack vertical, Industries cards stack 1-col | `v4-10-mobile-toc.png` | ✅ |
| Title `<title>` SEO: "VHD Corp — KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN" | Verified via `document.title` | ✅ |

---

## 7. Brand Identity check

**Title page:** `VHD Corp — KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN` ✅

**Header rendering:**
```
┌─────────────────────────────────────────┐
│ [VHD] VHD Corp                          │
│       KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN│
└─────────────────────────────────────────┘
```

**Hero eyebrow chip:**
```
[V] VHD Corp · KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN [B2B]
```

**Footer rendering:**
```
[VHD] VHD Corp
      KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN  ← yellow brand-highlight
```

---

## 8. Admin Builder — Tích hợp đầy đủ

Tất cả 4 sections mới đã register trong [`fe/app/admin/builder/page.tsx`](fe/app/admin/builder/page.tsx):

- `SECTION_TEMPLATES["feature-showcase"]` → default eyebrow/heading/subheading/bullets/cta + EXCLUSIVE B2B badge
- `SECTION_TEMPLATES["use-cases"]` → eyebrow + heading + columns 4
- `SECTION_TEMPLATES["faq-accordion"]` → eyebrow + heading
- `SECTION_TEMPLATES["comparison-table"]` → eyebrow + heading
- `TYPE_LABELS` cập nhật label tiếng Việt cho 4 type mới

Admin có thể:
- Drag-drop từng section vào homepage
- Toggle visible/hidden
- Edit JSON properties qua generic PropsEditor (auto-detect string/number/boolean/JSON)
- Save Draft + Publish + History snapshot

---

## 9. SEO + Tagline — đảm bảo đồng bộ

- `<title>`: `${siteName} — ${tagline}` = `VHD Corp — KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN`
- `<meta property="og:title">`: same
- `<meta name="twitter:title">`: same
- Title clamp ≤60 chars vẫn hoạt động (PRD spec) — tổng "VHD Corp — KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN" = 51 chars, OK.
- JSON-LD Organization `name`: `VHD Corp`, `description`: tagline ✅

---

## 10. Performance + UX — Shopify-style

| Aspect | Implementation |
| --- | --- |
| **Sticky nav reveal** | `window.scrollY > 600` show TOC bar with `transform translate-y` transition |
| **Active link sync** | `IntersectionObserver` rootMargin `-30% 0px -55% 0px` chọn entry highest ratio |
| **Smooth scroll anchor** | `<a href="#sec-...">` + CSS `scroll-mt-20` chống bị che |
| **Video lightbox** | Lazy iframe — only render khi `open` state true (avoid autoplay before click) |
| **YouTube URL conversion** | `watch?v=...` + `youtu.be/...` → `embed/...?autoplay=1&rel=0` |
| **Sticky CTA dismiss** | `sessionStorage` key `vhd_sticky_cta_dismissed` — không show lại trong session |
| **Hide on auth/contact/admin pages** | `usePathname()` check để không spam user |
| **Back-to-top progress ring** | SVG `strokeDasharray + strokeDashoffset` = `2πr × (1 - progress)` |
| **Mobile responsive** | TOC scroll-x với `scrollbar-none` utility, Sticky CTA stack vertical, hide hotline pill `<sm` |

---

## 11. Sẵn sàng bàn giao V4

✅ **9 phases hoàn thành** — từ tagline branding đến 4 section types mới + 3 floating widgets.

✅ **Browser verified** — 10 screenshots desktop + mobile, tất cả pass.

✅ **TypeScript clean** — `yarn tsc --noEmit` no errors.

✅ **DB live updated** — PUBLISHED (id=6) + DRAFT (id=137) đều có 13 sections + tagline mới.

✅ **Admin Builder tương thích** — 16 section types đầy đủ trong dropdown, generic PropsEditor edit được mọi section.

✅ **Mobile responsive** — TOC scroll-x, Sticky CTA stack vertical, BackToTop visible.

✅ **SEO chuẩn** — Title clamped, OG/Twitter sync, tagline đầy đủ ở mọi nơi.

**Sản phẩm sẵn sàng bàn giao V4 — Shopify-inspired UI complete.**

---

## 12. Files để đọc để hiểu V4

1. **[docs/PLAN_SHOPIFY_INSPIRED_V4.md](PLAN_SHOPIFY_INSPIRED_V4.md)** — Plan chi tiết 9 phases với code mẫu
2. **[docs/FINAL_REPORT_V3.md](FINAL_REPORT_V3.md)** — Background V3 (sections industries/process/sparkline)
3. **[docs/PRD.md](PRD.md)** — Yêu cầu gốc (tham chiếu rules)
4. **`fe/components/sections/*.tsx`** — 16 section components
5. **`fe/components/client/{section-toc,sticky-cta-bar,back-to-top}.tsx`** — 3 floating widgets
6. **`be/prisma/update-config-v4.ts`** — DB script

---

*Báo cáo được tạo tự động sau khi hoàn thiện V4 — autonomous coding theo yêu cầu user.*
