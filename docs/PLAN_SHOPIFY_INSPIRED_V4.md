# PLAN V4 — Áp dụng patterns Shopify Editions Winter 2026 cho VHD Corp

**Tham chiếu nguồn:** https://www.shopify.com/editions/winter2026 (The Renaissance Edition)
**Áp dụng cho:** VHD Corp B2B/B2C — nhựa, cao su, miến truyền thống
**Người triển khai:** Sonnet (model yếu) — các bước phải tường minh, từng câu lệnh rõ ràng

---

## ⚠️ BRAND IDENTITY — RULE TUYỆT ĐỐI

> **Tên công ty:** `VHD Corp`
> **Tagline đầy đủ:** `KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN`
>
> **Mọi nơi hiển thị brand đều PHẢI có tagline đầy đủ này** — không được rút gọn thành "Kết nối giá trị" hay "Hợp tác vững bền" riêng lẻ.
>
> Cụ thể phải hiển thị **đủ** ở:
> - **Header** — dưới logo "VHD Corp" (eyebrow text uppercase)
> - **Footer** — dưới logo (subtle text)
> - **Hero eyebrow chip** — sau "VHD Corp ·"
> - **Sticky TOC bar** — không cần (không gian hẹp, chỉ "VHD")
> - **Loading splash / SEO description** — dùng đầy đủ trong meta description nếu có
> - **`fe/lib/site-config.ts`** — `DEFAULT_SITE_CONFIG.brand.tagline = "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"`
> - **DB seed/update scripts** — phải set tagline đúng
>
> **Định dạng:** uppercase, có dấu thanh tiếng Việt đầy đủ, dấu gạch ngang dài `-` (không phải ` – ` em dash).

---

---

## 0. Đọc trước khi code (bắt buộc)

| File | Mục đích |
| --- | --- |
| `docs/PRD.md` | Để hiểu PRD gốc — KHÔNG được phá vỡ rules. UI strings tiếng Việt, route names tiếng Anh. |
| `docs/FINAL_REPORT_V3.md` | Để biết V3 đã làm gì — KHÔNG redo các thứ đã có. |
| `fe/types/site-config.ts` | Schema sections — phải thêm types mới ở đúng vị trí. |
| `fe/components/sections/index.tsx` | Dispatcher — phải register section mới ở đây. |
| `fe/lib/default-sections.ts` | Default homepage sections — phải thêm section mới vào array. |
| `fe/app/admin/builder/page.tsx` | SECTION_TEMPLATES + TYPE_LABELS — phải register section mới ở 2 chỗ này. |

> **Quy tắc vàng:** mọi section MỚI phải:
> 1. Thêm type vào `SectionType` union ở `fe/types/site-config.ts`.
> 2. Thêm interface `XSection` vào file đó, thêm vào union `Section`.
> 3. Tạo file `fe/components/sections/<name>.tsx` (default export component nhận `{ section }: { section: XSection }`).
> 4. Thêm `import` + `case` vào `fe/components/sections/index.tsx`.
> 5. Thêm template vào `SECTION_TEMPLATES` + label vào `TYPE_LABELS` ở `fe/app/admin/builder/page.tsx`.
> 6. Thêm vào `defaultHomeSections()` trong `fe/lib/default-sections.ts` nếu muốn xuất hiện mặc định.
> 7. Tạo script BE `be/prisma/update-config-vN.ts` để publish vào DB hiện hành (giống `update-config-v3.ts`).

---

## 1. Patterns Shopify áp dụng được + lý do

| # | Pattern Shopify | Áp dụng VHD Corp? | Lý do |
| --- | --- | --- | --- |
| A | Sticky horizontal section nav (12 anchor links) | ✅ Có | UX mạnh cho long-scrolling page B2B với nhiều sections |
| B | Feature card với video preview + thumbnail + play button | ✅ Có | Showcase nhà máy / quy trình sản xuất / demo sản phẩm |
| C | Skills/Shortcuts grid (emoji + prompt + CTA) | ✅ Có | "Use cases B2B" — đặt hàng số lượng lớn / OEM / private label |
| D | Multi-format content (video + image + checklist) | ✅ Có | Có sẵn từ rich editor, mở rộng cho section new |
| E | Pricing callouts ("Exclusive to Plus" badge) | ✅ Có | Badge "Khách hàng B2B" / "Đơn hàng > 10 triệu" |
| F | "Editions" history dropdown (year selector) | ❌ Bỏ | Không phù hợp — VHD không có yearly editions |
| G | Hero với video preview lớn | ⚠️ Optional | Có thể thêm option `heroVideo` cho hero section |
| H | "Back to navigation" links ở cuối mỗi section | ✅ Có | Đi kèm với Pattern A |
| I | Generous whitespace + light theme | ✅ Đã có | Giữ nguyên |
| J | CTA hierarchy (primary outline + secondary text) | ✅ Đã có | Giữ nguyên |

**Kết luận:** triển khai 5 features mới — A, B, C, E, H. (G optional, F skip).

---

## 2. Roadmap 8 phases (extended)

```text
Phase 0 [P0]: Brand Identity — render full tagline "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN" ở Header/Footer/Hero/DB
Phase 1 [P0]: Sticky Section TOC Bar (1 component, 1 hook) — BIG UX WIN
Phase 2 [P0]: New section type "feature-showcase" — video card layout
Phase 3 [P1]: New section type "use-cases" — Skills-like grid
Phase 4 [P1]: Floating sticky CTA bar (post-hero scroll)
Phase 5 [P2]: Hero "video preview" optional prop
Phase 6 [P2]: New section type "faq-accordion" — câu hỏi thường gặp B2B
Phase 7 [P2]: New section type "comparison-table" — bảng so sánh thông số sản phẩm
Phase 8 [P2]: "Back to top" floating button khi scroll sâu
```

### Patterns Shopify đã capture đầy đủ:

| Shopify pattern | VHD phase áp dụng | Status |
| --- | --- | --- |
| Sticky horizontal section nav (12 anchor links) | Phase 1 | ✅ |
| Active link highlight via IntersectionObserver | Phase 1 | ✅ |
| Feature card với video preview + thumbnail + play button | Phase 2 | ✅ |
| Video lightbox dialog | Phase 2 | ✅ |
| Skills/Shortcuts grid với emoji + prompt + CTA | Phase 3 | ✅ |
| Pricing/feature callouts ("EXCLUSIVE B2B" badge) | Phase 2/3 | ✅ |
| Floating CTA bar dismissible session-storage | Phase 4 | ✅ |
| Hero video preview (optional) | Phase 5 | ✅ |
| FAQ accordion với expand/collapse animation | Phase 6 | ✅ |
| Comparison table với row highlight on hover | Phase 7 | ✅ |
| "Back to top" floating button với scroll progress ring | Phase 8 | ✅ |
| Generous whitespace + light theme | Đã có | ✅ |
| CTA hierarchy primary/secondary | Đã có | ✅ |
| Editorial big typography | Đã có (type-display-xl) | ✅ |
| Card hover lift + shadow | Đã có (industries V3) | ✅ |
| Gradient accent bar trên card đặc biệt | Đã có (testimonials V3) | ✅ |
| Modular section-based layout | Đã có (PageBuilder) | ✅ |

Mỗi phase độc lập — có thể merge từng phase một. Sau mỗi phase: chạy `yarn tsc --noEmit` + Playwright screenshot.

---

## 3. PHASE 1 — Sticky Section TOC Bar

### 3.1. Mục tiêu visual

Sau khi user scroll qua hero, một thanh ngang gắn ở top của viewport (sticky). Thanh có:
- Logo nhỏ bên trái (link về `/`).
- Danh sách anchor links đến từng section trên trang chủ (id của section).
- Highlight section hiện tại (qua IntersectionObserver).
- CTA "Liên hệ" nhỏ bên phải.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [V] VHD  ·  Lĩnh vực  Sản phẩm  Quy trình  Đối tác  Tin tức  ┄  Liên hệ │
└──────────────────────────────────────────────────────────────────────────┘
```

Thiết kế: nền `bg-background/85 backdrop-blur` với border-bottom mỏng `border-foreground/8`. Active link: `text-brand-primary` + underline thin.

### 3.2. Files cần tạo / sửa

| File | Hành động |
| --- | --- |
| `fe/components/client/section-toc.tsx` | **MỚI** — component sticky bar |
| `fe/components/sections/index.tsx` | Sửa — bọc mỗi `<SectionRenderer>` trong `<section id="sec-{type}">` |
| `fe/app/(client)/page.tsx` | Sửa — render `<SectionToc>` ngay sau header (hoặc trên đầu PageRenderer) |

### 3.3. Code mẫu — `fe/components/client/section-toc.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteConfigStore } from "@/store/site-config.store";

interface TocItem {
  id: string;          // anchor id (e.g. "sec-industries")
  label: string;       // tiếng Việt hiển thị
}

interface Props {
  items: TocItem[];
  ctaHref?: string;
  ctaLabel?: string;
}

export function SectionToc({ items, ctaHref = "/contact", ctaLabel = "Liên hệ" }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const config = useSiteConfigStore((s) => s.config);
  const brand = config?.brand;
  const ref = useRef<HTMLDivElement>(null);

  // Hiện sau khi user scroll quá 600px (qua hero)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver phát hiện section đang trong viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;
        // Lấy entry có ratio cao nhất hoặc gần top nhất
        const top = visibleEntries.reduce((a, b) =>
          a.intersectionRatio > b.intersectionRatio ? a : b,
        );
        setActive(top.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <div
      ref={ref}
      aria-hidden={!visible}
      className={cn(
        "sticky top-0 z-40 border-b border-foreground/8 bg-background/85 backdrop-blur transition-transform duration-300",
        visible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <div className="container mx-auto flex h-12 items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {brand?.logo?.url ? (
            <Image src={brand.logo.url} alt={brand.siteName ?? "VHD"} width={24} height={24} className="h-6 w-6 rounded object-contain" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded bg-(--vhd-color-primary) text-[10px] font-bold text-white">V</span>
          )}
          <span className="text-sm font-bold tracking-tight text-foreground">VHD</span>
        </Link>

        <span aria-hidden className="h-4 w-px bg-foreground/15" />

        <nav className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active === it.id
                  ? "bg-(--vhd-color-primary)/10 text-brand-primary"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              {it.label}
            </a>
          ))}
        </nav>

        <Link
          href={ctaHref}
          className="hidden items-center gap-1 rounded-full bg-(--vhd-color-primary) px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-(--vhd-color-primary)/90 sm:inline-flex"
        >
          {ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
```

> **Đảm bảo:** `scrollbar-none` utility class. Nếu chưa có, thêm vào `fe/app/globals.css`:
> ```css
> .scrollbar-none::-webkit-scrollbar { display: none; }
> .scrollbar-none { scrollbar-width: none; }
> ```

### 3.4. Sửa `fe/components/sections/index.tsx` — wrap section với id

```tsx
export function PageRenderer({ sections }: { sections: Section[] }) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  return (
    <>
      {ordered.map((s) => (
        <section key={s.id} id={`sec-${s.type}`} className="scroll-mt-20">
          <SectionRenderer section={s} />
        </section>
      ))}
    </>
  );
}
```

> **Note:** `scroll-mt-20` đảm bảo khi anchor click không bị TOC che. Tăng nếu TOC cao hơn 80px.

### 3.5. Sửa `fe/app/(client)/page.tsx`

```tsx
import { SectionToc } from "@/components/client/section-toc";

const TOC_LABELS: Record<string, string> = {
  hero: "Trang chủ",
  industries: "Lĩnh vực",
  "stats-counter": "Số liệu",
  "featured-products": "Sản phẩm",
  process: "Quy trình",
  testimonials: "Đánh giá",
  "blog-preview": "Tin tức",
  "contact-cta": "Liên hệ",
  partners: "Đối tác",
  "category-grid": "Danh mục",
  "banner-slider": "Banner",
  "use-cases": "Use Cases",
  "feature-showcase": "Showcase",
};

// Trong return:
const tocItems = sections
  .filter((s) => s.visible && s.type !== "hero")
  .map((s) => ({ id: `sec-${s.type}`, label: TOC_LABELS[s.type] ?? s.type }));

return (
  <>
    <JsonLd id="org" data={orgLd} />
    <JsonLd id="site" data={siteLd} />
    <JsonLd id="business" data={localBusinessLd} />
    <SectionToc items={tocItems} />
    <PageRenderer sections={sections} />
  </>
);
```

### 3.6. Test Phase 1

- [ ] `yarn tsc --noEmit` pass.
- [ ] Reload `http://localhost:3000`. Scroll xuống — TOC bar slide vào từ top.
- [ ] Click "Lĩnh vực" → smooth scroll đến section industries.
- [ ] Cuộn manually → active link cập nhật theo section đang xem.
- [ ] Mobile 390px — TOC scroll-x được.

---

## 4. PHASE 2 — Section "feature-showcase"

### 4.1. Mục tiêu visual

Section showcase 1 feature lớn duy nhất, layout 2-column:
- Left: tiêu đề + subheading + bullets + CTA button.
- Right: video thumbnail (16:9) với play button overlay → click mở dialog phát video.

Áp dụng cho VHD: showcase "Nhà máy nhựa", "Dây chuyền cao su", "Làng nghề miến" — admin quyết định.

```
┌──────────────────────────────────────────────────────────────┐
│  EYEBROW                                                     │
│  Heading lớn (display-md)                                    │   ┌──────────┐
│  Subheading dài, giải thích chi tiết feature                 │   │  ▶ Video │
│  • Bullet 1                                                  │   │ thumbnail│
│  • Bullet 2                                                  │   │  16:9    │
│  • Bullet 3                                                  │   └──────────┘
│  [Tìm hiểu thêm →]                                           │
└──────────────────────────────────────────────────────────────┘
```

### 4.2. Type definition — `fe/types/site-config.ts`

```ts
// 1. Thêm vào SectionType union
export type SectionType =
  | "hero"
  | "featured-products"
  // … các type cũ
  | "industries"
  | "process"
  | "feature-showcase"   // MỚI
  | "use-cases"          // MỚI (Phase 3)
  | "custom-html";

// 2. Thêm interface
export type FeatureShowcaseSection = BaseSection<"feature-showcase", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  bullets?: string[];
  ctaText?: string;
  ctaLink?: string;
  imageSide?: "left" | "right";  // default "right"
  videoUrl?: string;              // YouTube/MP4 URL — mở dialog khi click
  thumbnailUrl?: string;          // ảnh poster cho video; nếu không có dùng gradient fallback
  badge?: string;                 // optional pricing/feature badge (e.g. "EXCLUSIVE B2B")
}>;

// 3. Thêm vào Section union
export type Section =
  | HeroSection
  | FeaturedProductsSection
  // …
  | IndustriesSection
  | ProcessSection
  | FeatureShowcaseSection      // MỚI
  | UseCasesSection             // MỚI (Phase 3)
  | CustomHtmlSection;
```

### 4.3. Component — `fe/components/sections/feature-showcase.tsx`

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Play } from "lucide-react";
import type { FeatureShowcaseSection } from "@/types/site-config";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function FeatureShowcase({ section }: { section: FeatureShowcaseSection }) {
  const p = section.props;
  const imageSide = p.imageSide ?? "right";
  const [open, setOpen] = useState(false);

  // Convert YouTube watch URL → embed URL nếu cần
  const embedUrl = p.videoUrl?.includes("youtube.com/watch?v=")
    ? p.videoUrl.replace("watch?v=", "embed/") + "?autoplay=1&rel=0"
    : p.videoUrl;

  return (
    <section className="relative overflow-hidden py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <div className={cn(
          "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16",
          imageSide === "left" && "lg:[&>*:first-child]:order-2",
        )}>
          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            {p.badge && (
              <span className="mb-4 inline-flex items-center rounded-full bg-(--vhd-color-highlight)/15 px-3 py-1 text-xs font-bold tracking-wider text-brand-highlight uppercase">
                {p.badge}
              </span>
            )}
            {p.eyebrow && <p className="type-eyebrow text-brand-accent">{p.eyebrow}</p>}
            <h2 className="mt-3 type-display-md text-foreground">{p.heading}</h2>
            {p.subheading && (
              <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>
            )}
            {p.bullets && p.bullets.length > 0 && (
              <ul className="mt-7 space-y-3">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-foreground/80">
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-(--vhd-color-primary)/10 text-brand-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.ctaText && p.ctaLink && (
              <Link
                href={p.ctaLink}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--vhd-color-primary) px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--vhd-color-primary)/90"
              >
                {p.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>

          {/* Media column */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-video overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-[0_18px_60px_-30px_rgba(15,35,86,0.4)]"
          >
            {p.thumbnailUrl ? (
              <Image
                src={p.thumbnailUrl}
                alt={p.heading}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 [background:radial-gradient(80%_80%_at_50%_30%,color-mix(in_srgb,var(--vhd-color-accent)_35%,transparent),transparent),radial-gradient(80%_80%_at_50%_100%,color-mix(in_srgb,var(--vhd-color-primary)_45%,transparent),transparent)]" />
            )}
            {p.videoUrl && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Phát video"
                className="absolute inset-0 grid place-items-center bg-black/15 transition-colors hover:bg-black/25"
              >
                <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-primary shadow-xl transition-transform duration-300 hover:scale-110">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </span>
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {p.videoUrl && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl border-none bg-black p-0">
            <div className="aspect-video w-full">
              {open && embedUrl && (
                <iframe
                  src={embedUrl}
                  title={p.heading}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
```

### 4.4. Register trong dispatcher + builder + defaults

**`fe/components/sections/index.tsx`:**
```tsx
import FeatureShowcase from "./feature-showcase";

// trong switch:
case "feature-showcase":
  return <FeatureShowcase section={section} />;
```

**`fe/app/admin/builder/page.tsx`:**
```tsx
// trong SECTION_TEMPLATES:
"feature-showcase": () => ({
  id: `fs-${Date.now()}`,
  type: "feature-showcase",
  order: 0,
  visible: true,
  props: {
    eyebrow: "Showcase",
    heading: "Tham quan nhà máy VHD",
    subheading: "Hệ thống nhà máy hiện đại đạt chuẩn ISO 9001, công suất 50.000 sản phẩm/tháng.",
    bullets: ["50.000 sản phẩm/tháng", "Đạt chuẩn ISO 9001", "Đội ngũ 200+ kỹ sư"],
    ctaText: "Tìm hiểu thêm",
    ctaLink: "/about",
    imageSide: "right",
  },
}),

// trong TYPE_LABELS:
"feature-showcase": "Showcase tính năng",
```

**`fe/lib/default-sections.ts`** — thêm sau process (ví dụ order 6):
```tsx
{
  id: "showcase-default",
  type: "feature-showcase",
  order: 6,
  visible: true,
  props: {
    eyebrow: "Tham quan VHD",
    heading: "Nhà máy đạt chuẩn ISO 9001 — minh chứng cho cam kết chất lượng",
    subheading: "Khách hàng B2B có thể đặt lịch tham quan trực tiếp dây chuyền sản xuất, quan sát kiểm định chất lượng từ nguyên liệu đến thành phẩm.",
    bullets: [
      "Diện tích nhà xưởng 12.000m² tại KCN Tân Bình",
      "Công suất 50.000 sản phẩm/tháng — sẵn đáp ứng đơn hàng OEM",
      "Đội ngũ 200+ kỹ sư + chuyên viên QA/QC",
      "Hệ thống ERP truy xuất nguồn gốc 100%",
    ],
    ctaText: "Đặt lịch tham quan",
    ctaLink: "/contact",
    badge: "EXCLUSIVE B2B",
    imageSide: "right",
    // Admin có thể thêm videoUrl + thumbnailUrl sau qua builder
  },
},
```

### 4.5. Test Phase 2

- [ ] `yarn tsc --noEmit` pass.
- [ ] Reload home — section feature-showcase hiển thị đúng layout 2-col.
- [ ] Click play button khi `videoUrl` set → dialog mở phát video.
- [ ] Toggle `imageSide: "left"` → hình bên trái text bên phải.
- [ ] Mobile 390px — stack thẳng đứng.

---

## 5. PHASE 3 — Section "use-cases" (Skills-like grid)

### 5.1. Mục tiêu visual

Grid 3-4 cột các "kịch bản B2B" với emoji + tiêu đề + description ngắn + CTA "Xem ví dụ →". Pattern này đến từ Shopify Sidekick "Skills".

```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ 📦              │ │ 🏷️              │ │ 🚚              │ │ 🔧              │
│ Đặt hàng B2B    │ │ OEM/Private    │ │ Giao theo lịch │ │ Sản xuất riêng │
│ số lượng lớn    │ │ Label          │ │                │ │                │
│ Mô tả 2 dòng…   │ │ Mô tả 2 dòng…  │ │ Mô tả…         │ │ Mô tả…         │
│ [Liên hệ →]     │ │ [Liên hệ →]    │ │ [Liên hệ →]    │ │ [Liên hệ →]    │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

### 5.2. Type — `fe/types/site-config.ts`

```ts
export type UseCasesSection = BaseSection<"use-cases", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  cases?: {
    emoji: string;     // single emoji "📦"
    title: string;
    description: string;
    href?: string;
    badge?: string;    // optional pricing tag
  }[];
  columns?: 3 | 4;     // default 4
}>;
```

### 5.3. Component — `fe/components/sections/use-cases.tsx`

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { UseCasesSection } from "@/types/site-config";
import { cn } from "@/lib/utils";

const DEFAULT_CASES: NonNullable<UseCasesSection["props"]["cases"]> = [
  {
    emoji: "📦",
    title: "Đặt hàng B2B số lượng lớn",
    description: "Đặt từ 100 sản phẩm trở lên với giá cạnh tranh, hợp đồng dài hạn.",
    href: "/contact?topic=b2b",
  },
  {
    emoji: "🏷️",
    title: "OEM / Private Label",
    description: "Sản xuất theo thương hiệu của bạn, bao bì in logo, đóng gói chuẩn xuất khẩu.",
    href: "/contact?topic=oem",
    badge: "EXCLUSIVE",
  },
  {
    emoji: "🚚",
    title: "Giao hàng theo lịch",
    description: "Đăng ký giao định kỳ tuần / tháng, không lo thiếu hàng tồn kho.",
    href: "/contact?topic=schedule",
  },
  {
    emoji: "🔧",
    title: "Sản xuất theo bản vẽ",
    description: "Đặt sản xuất chi tiết theo bản vẽ kỹ thuật, kích thước phi tiêu chuẩn.",
    href: "/contact?topic=custom",
  },
];

export default function UseCases({ section }: { section: UseCasesSection }) {
  const p = section.props;
  const cases = p.cases?.length ? p.cases : DEFAULT_CASES;
  const cols = p.columns ?? 4;

  return (
    <section className="relative bg-(--vhd-color-surface)/40 py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          {p.eyebrow && <p className="type-eyebrow text-brand-accent">{p.eyebrow}</p>}
          <h2 className="mt-3 type-display-md text-foreground">{p.heading}</h2>
          {p.subheading && <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>}
        </motion.div>

        <div className={cn(
          "grid gap-5 sm:grid-cols-2",
          cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}>
          {cases.map((c, i) => (
            <motion.div
              key={`${c.title}-${i}`}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col rounded-2xl border border-foreground/8 bg-card p-6 transition-all hover:-translate-y-1 hover:border-(--vhd-color-primary)/30 hover:shadow-[0_18px_40px_-20px_rgba(15,35,86,0.28)]"
            >
              {c.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-(--vhd-color-highlight)/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-brand-highlight uppercase">
                  {c.badge}
                </span>
              )}
              <span className="text-4xl leading-none" aria-hidden>{c.emoji}</span>
              <h3 className="mt-4 font-heading text-base font-bold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">{c.description}</p>
              {c.href && (
                <Link
                  href={c.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary transition-colors group-hover:gap-2"
                >
                  Liên hệ tư vấn
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 5.4. Register — y hệt Phase 2

- Add `import UseCases` + `case "use-cases"` vào `fe/components/sections/index.tsx`.
- Add `"use-cases"` template + label vào `fe/app/admin/builder/page.tsx`.
- Optional: thêm vào `defaultHomeSections()` ở vị trí sau industries (order = 3 — đẩy stats xuống 4, etc.).

### 5.5. Test Phase 3

- [ ] `yarn tsc --noEmit` pass.
- [ ] Reload home — grid 4 cards hiển thị đúng emoji + title + desc + CTA.
- [ ] Hover card → translate-y -1 + shadow tăng.
- [ ] Mobile — 1 column.
- [ ] Tablet — 2 columns.

---

## 6. PHASE 4 — Floating Sticky CTA Bar

### 6.1. Mục tiêu visual

Sau khi user scroll qua hero (>80% viewport height), hiện một bar nhỏ ở **bottom** của viewport (sticky-bottom) với:
- Text trái: "Cần tư vấn báo giá B2B?"
- Phone link: "+84 28 3xxx xxxx"
- CTA primary: "Liên hệ ngay →"
- Close button (×) — lưu vào `sessionStorage` để không show lại trong session.

Trên mobile: stack thẳng đứng, padding compact.

```
┌────────────────────────────────────────────────────────────────────┐
│ 💬 Cần tư vấn báo giá B2B?    📞 +84 28 3xxx    [Liên hệ ngay →] × │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2. File MỚI — `fe/components/client/sticky-cta-bar.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircle, Phone, X } from "lucide-react";

const SESSION_KEY = "vhd_sticky_cta_dismissed";

export function StickyCtaBar({
  hotline = "+84 28 3000 0000",
  ctaHref = "/contact",
}: {
  hotline?: string;
  ctaHref?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    const onScroll = () => {
      const reveal = window.scrollY > window.innerHeight * 0.8;
      setShow(reveal);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-4xl px-4"
        >
          <div className="relative flex flex-col items-stretch gap-3 rounded-2xl border border-foreground/10 bg-background/95 p-3 shadow-[0_18px_60px_-20px_rgba(15,35,86,0.35)] backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-(--vhd-color-highlight)/15 text-brand-highlight">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Cần tư vấn báo giá B2B?</p>
              <p className="text-xs text-foreground/55">Phản hồi trong 24 giờ — VHD luôn sẵn sàng.</p>
            </div>
            <a
              href={`tel:${hotline.replace(/\s/g, "")}`}
              className="hidden items-center gap-1.5 rounded-full border border-foreground/10 px-4 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:border-(--vhd-color-primary)/40 hover:text-foreground sm:inline-flex"
            >
              <Phone className="h-3.5 w-3.5" />
              {hotline}
            </a>
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-(--vhd-color-primary) px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-(--vhd-color-primary)/90"
            >
              Liên hệ ngay
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Đóng"
              className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground sm:relative sm:right-0 sm:top-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 6.3. Mount trong layout

Thêm vào `fe/app/(client)/layout.tsx` (sau `<main>`, trước `<Footer>`):

```tsx
import { StickyCtaBar } from "@/components/client/sticky-cta-bar";

// trong return:
<>
  <Header />
  <main className="flex-1">{children}</main>
  <StickyCtaBar />
  <Footer />
</>
```

> **Cẩn thận:** Không gây xung đột với `FloatingContact` widget hiện có — kiểm tra layout xem hai cái có chồng nhau không. Nếu có, cho `StickyCtaBar` cao hơn `FloatingContact` 80px (e.g. `bottom-24` thay vì `bottom-4`).

### 6.4. Test Phase 4

- [ ] Reload home, chưa scroll — không thấy bar.
- [ ] Scroll xuống >80% viewport — bar slide từ dưới lên.
- [ ] Click `×` → bar biến mất, reload không hiện lại trong session, mở tab mới hiện lại.
- [ ] Mobile — stack đúng, không che floating contact.

---

## 7. PHASE 5 — Hero Video Preview (optional)

### 7.1. Schema update — `fe/types/site-config.ts`

Thêm vào `HeroSection`:
```ts
export type HeroSection = BaseSection<"hero", {
  // … existing
  videoUrl?: string;        // YouTube embed URL
  videoThumbnail?: string;  // poster image
}>;
```

### 7.2. Render trong `fe/components/sections/hero.tsx`

Sau trust strip, thêm 1 video card (chỉ render khi `p.videoUrl` set):

```tsx
{p.videoUrl && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay: 1 }}
    className="mt-10 lg:hidden" // chỉ mobile/tablet — desktop có HeroDomainArt
  >
    <button
      type="button"
      onClick={() => setVideoOpen(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-lg"
    >
      {p.videoThumbnail ? (
        <Image src={p.videoThumbnail} alt="Video preview" fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-(--vhd-color-primary)/85" />
      )}
      <span className="absolute inset-0 grid place-items-center bg-black/15 transition-colors group-hover:bg-black/25">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-brand-primary shadow-lg">
          <Play className="ml-0.5 h-6 w-6 fill-current" />
        </span>
      </span>
    </button>
  </motion.div>
)}
```

(Cũng add `Dialog` mở video — y như Phase 2.)

### 7.3. Test

- [ ] Set `videoUrl` qua admin builder → video card xuất hiện trên mobile.
- [ ] Click play → dialog mở phát video.
- [ ] Empty `videoUrl` → không render gì.

---

## 8. Sau khi xong — Update DB

Tạo file `be/prisma/update-config-v4.ts` (copy từ v3):

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient, ConfigStatus } from "@vhd/prisma-client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NEW_HOME_SECTIONS = [
  // copy từ default-sections.ts updated, ĐÚNG order:
  // 1. hero
  // 2. industries
  // 3. use-cases   ← NEW
  // 4. stats-counter
  // 5. featured-products
  // 6. process
  // 7. feature-showcase  ← NEW
  // 8. testimonials
  // 9. blog-preview
  // 10. contact-cta
  // 11. partners
];

async function main() {
  for (const status of [ConfigStatus.PUBLISHED, ConfigStatus.DRAFT] as const) {
    const current = await prisma.siteConfig.findFirst({
      where: { key: "main", status },
      orderBy: { version: "desc" },
    });
    if (!current) continue;
    const val = (current.value as Record<string, unknown>) ?? {};
    const pages = (val.pages as Record<string, unknown>) ?? {};
    const home = (pages.home as Record<string, unknown>) ?? {};
    const newVal = {
      ...val,
      pages: { ...pages, home: { ...home, sections: NEW_HOME_SECTIONS } },
    };
    await prisma.siteConfig.update({
      where: { id: current.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { value: newVal as any },
    });
    console.log(`✓ Updated ${status} (id=${current.id}) — ${NEW_HOME_SECTIONS.length} sections`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Chạy: `cd be && npx ts-node prisma/update-config-v4.ts`

---

## 9. Final test checklist

```bash
# 1. TypeScript check
cd fe && yarn tsc --noEmit

# 2. Build sanity (optional, dev server đang chạy)
yarn build

# 3. Browser verify (Playwright)
# - http://localhost:3000 — scroll xem có TOC sticky, sticky CTA, các sections mới
# - http://localhost:3000/admin/builder — drag thử section "Use Cases" và "Showcase tính năng"
# - 390×844 mobile responsive
# - Lighthouse SEO score: still 100
```

Test JSON-LD vẫn nguyên vẹn (3 schemas cho home / 2 cho product/post/contact).

---

## 10. Quy tắc viết code (cho model yếu)

1. **Đọc file cũ trước khi sửa** — không bịa import / class / API.
2. **Không tự nghĩ ra Tailwind class** — copy từ component cũ trong `fe/components/sections/` (đặc biệt từ V3 industries.tsx và process.tsx — chuẩn nhất).
3. **Tuyệt đối không dùng `any`** trừ khi đã có `eslint-disable-next-line` comment.
4. **Mọi `<button>` phải có `type="button"`** — nếu submit form thì `type="submit"`.
5. **Mọi `<Link href=...>` external phải có `rel="noopener noreferrer"`** + `target="_blank"`.
6. **Mọi animation Framer Motion phải dùng `viewport={{ once: true, margin: "-80px" }}`** — không animate lại khi user scroll back.
7. **Dùng `motion.div` thay vì `<div>` chỉ khi cần animation** — nếu không cần thì là div thường.
8. **Tiếng Việt UI strings** — không hardcode ở mức internal label, dùng `messages/vi.json` nếu có. (Tạm chấp nhận hardcode ở component vì codebase đang vậy.)
9. **`suppressHydrationWarning` cần thiết cho motion components** — luôn thêm khi animate.
10. **Trước khi return component** — luôn check edge case: `if (sections.length === 0) return null;` v.v.

---

## 11. Kết quả mong đợi sau 5 phases

✅ Trang chủ scroll dài 11+ sections với sticky TOC bar trên đầu — UX giống editorial site cao cấp.
✅ 2 section types mới: Feature Showcase (video card) + Use Cases (Skills-like grid).
✅ Floating sticky CTA bar đẩy conversion B2B.
✅ Hero hỗ trợ video preview optional (admin set qua builder).
✅ Tất cả 14+ section types có sẵn trong Admin Builder cho admin tùy chỉnh.

**Estimate effort:** ~6-8 giờ với model yếu, 2-3 giờ với model mạnh. Mỗi phase độc lập — có thể merge từng cái.

---

*Plan này dùng làm input cho Sonnet để code triển khai. Mỗi phase test xong rồi mới sang phase tiếp theo.*
