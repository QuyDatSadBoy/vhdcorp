# PLAN V5 — Hiệu ứng siêu đẹp từ Shopify Editions Winter 2026

**Tham chiếu:** https://www.shopify.com/editions/winter2026
**Mục tiêu:** Áp dụng các **hiệu ứng visual đẹp xuất sắc** của Shopify vào VHD Corp — không phải structural patterns mà là animations / micro-interactions / scroll effects làm web trông cao cấp.
**Người triển khai:** Sonnet 4.6 (model code) — copy-paste code theo từng phase
**Brand match:** Logo VHD = vòng cung 4 màu `#1B3A8C` (navy) `#4FB8E7` (sky) `#F5A623` (gold) `#C8102E` (red), handshake biểu tượng. Mọi hiệu ứng phải dùng đúng brand palette.

---

## ⚠️ Quy tắc bất di bất dịch

1. **KHÔNG được phá V4** — chỉ thêm hiệu ứng, không xóa sections / components hiện có.
2. **Mọi animation phải tôn trọng `prefers-reduced-motion`** — dùng `useReducedMotion()` từ Framer Motion.
3. **Brand colors only** — không dùng hex bừa, dùng CSS vars `var(--vhd-color-primary/accent/highlight/danger)`.
4. **Mobile fallback** — heavy effects (parallax, 3D tilt, scroll-drawn SVG) phải có version đơn giản cho mobile (chỉ fade-in).
5. **Test sau mỗi phase** — `yarn tsc --noEmit` + Playwright screenshot.
6. **Tagline đầy đủ** — không động vào tagline "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN" đã có.

---

## Roadmap 8 hiệu ứng (mỗi phase độc lập)

| # | Hiệu ứng | Shopify reference | Effort | Impact |
| --- | --- | --- | --- | --- |
| **E1** | Smooth scroll buttery (Lenis) | Toàn site Shopify scroll mượt | XS (10 LOC) | 🔥🔥🔥 |
| **E2** | Magnetic CTA buttons | "Get app", "Read help doc" hover | S (1 component) | 🔥🔥🔥 |
| **E3** | Marquee brand tape | "Renaissance Edition" rolling text | S (1 component) | 🔥🔥 |
| **E4** | Scroll-drawn SVG handshake | Hero animations stroke draw | M (1 component + SVG) | 🔥🔥🔥 |
| **E5** | Animated gradient blob mesh | Background blobs morph | S (1 component) | 🔥🔥 |
| **E6** | Gradient shimmer text on key words | Heading "Renaissance" highlight | XS (CSS only) | 🔥🔥 |
| **E7** | Parallax multi-layer hero | Editions multi-layer scroll | M (refactor hero) | 🔥🔥🔥 |
| **E8** | Sticky scroll storytelling section | "How it works" pinned section | M (1 section type new) | 🔥🔥🔥 |

---

## E1 — Smooth scroll buttery với Lenis

### Mục tiêu

Toàn site có scroll cảm giác "trượt mượt" như Shopify/Apple — không bị giật khi cuộn nhanh. Ảnh hưởng tích cực đến mọi section đã có.

### Bước 1 — Install

```bash
cd fe && yarn add lenis
```

### Bước 2 — Tạo file `fe/components/animations/lenis-provider.tsx`

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
```

### Bước 3 — Mount vào `fe/app/(client)/layout.tsx`

```tsx
import { LenisProvider } from "@/components/animations/lenis-provider";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <LenisProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <StickyCtaBar />
        <BackToTop />
        <FloatingContact />
      </div>
    </LenisProvider>
  );
}
```

### CSS bắt buộc — thêm vào `fe/app/globals.css` đầu file

```css
html.lenis,
html.lenis body {
  height: auto;
}
.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}
.lenis.lenis-smooth [data-lenis-prevent] {
  overscroll-behavior: contain;
}
.lenis.lenis-stopped {
  overflow: hidden;
}
.lenis.lenis-scrolling iframe {
  pointer-events: none;
}
```

### ⚠️ Cẩn thận với SectionToc + StickyCtaBar

Hai widget này đang dùng `window.scrollY` listener. Lenis tương thích — không cần đổi.

---

## E2 — Magnetic CTA buttons

### Mục tiêu

Khi cursor ở gần CTA primary, button "hút" theo cursor 6-10px. Tạo cảm giác premium, micro-interaction tinh tế.

### Tạo file `fe/components/animations/magnetic-button.tsx`

```tsx
"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  strength?: number; // 0.2 = subtle, 0.5 = strong
  asChild?: boolean;
}

export function MagneticButton({ children, className, strength = 0.35, asChild }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.6 });
  const reduce = useReducedMotion();

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={cn("inline-block will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
```

### Sử dụng — bọc CTA button

Trong `fe/components/sections/hero.tsx`, bọc primary button:

```tsx
import { MagneticButton } from "@/components/animations/magnetic-button";

<MagneticButton strength={0.3}>
  <Button asChild size="lg" className="...">
    <Link href={p.ctaLink}>...</Link>
  </Button>
</MagneticButton>
```

Áp dụng cho tất cả CTAs primary trong: hero, contact-cta, feature-showcase, contact page.

---

## E3 — Marquee brand tape

### Mục tiêu

Một dải băng màu primary chạy ngang chứa text lặp lại: "KẾT NỐI GIÁ TRỊ" "HỢP TÁC VỮNG BỀN" "VHD CORP" + dấu chấm bullet vàng giữa các từ. Đặt ở giữa các section để tạo nhịp visual.

### Tạo file `fe/components/animations/brand-marquee.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text?: string;
  duration?: number;
  variant?: "primary" | "highlight" | "outline";
  className?: string;
}

const DEFAULT_PHRASES = [
  "KẾT NỐI GIÁ TRỊ",
  "HỢP TÁC VỮNG BỀN",
  "VHD CORP",
  "B2B / B2C",
  "TỔNG KHO NHỰA · CAO SU · MIẾN",
];

export function BrandMarquee({
  text,
  duration = 38,
  variant = "primary",
  className,
}: Props) {
  const phrases = text ? [text] : DEFAULT_PHRASES;
  const items = Array.from({ length: 8 }).flatMap((_, i) =>
    phrases.map((p, j) => ({ key: `${i}-${j}`, text: p })),
  );

  const styleMap = {
    primary: "bg-(--vhd-color-primary) text-white",
    highlight: "bg-(--vhd-color-highlight) text-(--vhd-color-primary)",
    outline: "border-y border-foreground/10 bg-background text-foreground",
  };

  return (
    <div className={cn("relative overflow-hidden py-4 md:py-5", styleMap[variant], className)}>
      <motion.div
        className="flex w-max items-center gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {[...items, ...items].map((it, i) => (
          <span key={`${it.key}-${i}`} className="flex items-center gap-8">
            <span className="font-heading text-lg font-bold uppercase tracking-[0.2em] md:text-xl">
              {it.text}
            </span>
            <Sparkle
              className={cn(
                "h-3.5 w-3.5",
                variant === "primary" && "text-(--vhd-color-highlight)",
                variant === "highlight" && "text-(--vhd-color-primary)",
                variant === "outline" && "text-(--vhd-color-accent)",
              )}
              fill="currentColor"
            />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
```

### Sử dụng

Trong `fe/app/(client)/page.tsx`, chèn `<BrandMarquee />` giữa các sections:

```tsx
import { BrandMarquee } from "@/components/animations/brand-marquee";

<SectionToc items={tocItems} />
<HeroSection ... />
<BrandMarquee variant="primary" />   {/* sau hero */}
<IndustriesSection ... />
{/* ... */}
<BrandMarquee variant="highlight" duration={50} />  {/* sau testimonials */}
```

Hoặc thêm thẳng vào [`PageRenderer`](fe/components/sections/index.tsx) để admin kiểm soát qua section type "brand-marquee" mới (tự thêm type vào `site-config.ts`).

---

## E4 — Scroll-drawn SVG handshake

### Mục tiêu

Khi user cuộn qua hero, một SVG outline biểu tượng "handshake" của VHD vẽ dần (path stroke draw) — kết hợp với `useScroll` của Framer Motion.

### Tạo file `fe/components/animations/handshake-draw.tsx`

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Props {
  className?: string;
}

export function HandshakeDraw({ className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.9, 1], [0, 1, 1, 0.6]);

  return (
    <div ref={ref} className={className}>
      <motion.svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        style={{ opacity }}
        aria-hidden
      >
        {/* Outer ring (yellow sweep) */}
        <motion.path
          d="M 160 30 A 130 130 0 1 1 159 30"
          stroke="#F5A623"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
          transition={{ duration: 0 }}
        />
        {/* Inner ring (red bottom curve) */}
        <motion.path
          d="M 50 200 Q 160 320 270 200"
          stroke="#C8102E"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Roof */}
        <motion.path
          d="M 110 130 L 160 90 L 210 130"
          stroke="#1B3A8C"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Left hand */}
        <motion.path
          d="M 105 145 L 150 175 L 130 200 L 95 175 Z"
          stroke="#1B3A8C"
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Right hand */}
        <motion.path
          d="M 215 145 L 170 175 L 190 200 L 225 175 Z"
          stroke="#4FB8E7"
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Connecting fingers */}
        <motion.path
          d="M 145 178 L 175 178"
          stroke="#1B3A8C"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
      </motion.svg>
    </div>
  );
}
```

### Sử dụng

Đặt vào hero hoặc industries section như background decoration:

```tsx
<div className="absolute right-10 top-1/3 -z-0 hidden h-72 w-72 lg:block">
  <HandshakeDraw />
</div>
```

---

## E5 — Animated gradient blob mesh

### Mục tiêu

Background blob 4 màu logo (navy/sky/gold/red) mượt mượt morph như chất lỏng — đặt làm background cho hero hoặc CTA section.

### Tạo file `fe/components/animations/blob-mesh.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

interface Props {
  className?: string;
  speed?: number;
}

export function BlobMesh({ className, speed = 14 }: Props) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <motion.div
        className="absolute -left-20 top-0 h-[60%] w-[55%] rounded-full bg-(--vhd-color-accent)/40 blur-3xl mix-blend-multiply"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: speed, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-20 top-1/4 h-[65%] w-[60%] rounded-full bg-(--vhd-color-highlight)/30 blur-3xl mix-blend-multiply"
        animate={{ x: [0, -70, 50, 0], y: [0, 60, -40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: speed * 1.2, ease: "easeInOut", repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute left-1/3 -bottom-20 h-[55%] w-[55%] rounded-full bg-(--vhd-color-primary)/35 blur-3xl mix-blend-multiply"
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.92, 1] }}
        transition={{ duration: speed * 1.4, ease: "easeInOut", repeat: Infinity, delay: 2 }}
      />
      <motion.div
        className="absolute right-1/4 bottom-0 h-[40%] w-[40%] rounded-full bg-(--vhd-color-danger)/25 blur-3xl mix-blend-multiply"
        animate={{ x: [0, -30, 40, 0], y: [0, 30, -20, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: speed * 1.6, ease: "easeInOut", repeat: Infinity, delay: 3 }}
      />
    </div>
  );
}
```

### Sử dụng

Trong hero (chỉ khi `!p.bgImage`), thêm bên cạnh các orbs hiện có:

```tsx
{!p.bgImage && <BlobMesh className="-z-30 opacity-70" />}
```

Hoặc trong contact-cta:

```tsx
<motion.div className="relative isolate overflow-hidden rounded-3xl ...">
  <BlobMesh className="-z-10 opacity-50" />
  {/* nội dung CTA */}
</motion.div>
```

---

## E6 — Gradient shimmer text on key words

### Mục tiêu

Từ "nhựa", "miến", "VHD" trong heading có gradient vàng-cam-đỏ shimmer chạy ngang. Class chỉ cần thêm vào span.

### Thêm vào `fe/app/globals.css`

```css
@utility text-shimmer-brand {
  background-image: linear-gradient(
    110deg,
    color-mix(in srgb, var(--vhd-color-highlight) 95%, transparent) 0%,
    color-mix(in srgb, var(--vhd-color-danger) 70%, transparent) 35%,
    color-mix(in srgb, var(--vhd-color-highlight) 95%, transparent) 70%,
    color-mix(in srgb, var(--vhd-color-highlight) 95%, transparent) 100%
  );
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: shimmer-brand 6s linear infinite;
}

@keyframes shimmer-brand {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Sử dụng

Trong hero `AnimatedHeading`, thay `word-highlight` bằng:

```tsx
<span className={cn(isMarked && "text-shimmer-brand font-black")}>{word}</span>
```

Hoặc giữ song song — `word-highlight` cho visual khối, `text-shimmer-brand` cho shimmer text.

---

## E7 — Parallax multi-layer hero

### Mục tiêu

Hero có 3 lớp depth với 3 tốc độ scroll khác nhau:
- Layer 1 (xa nhất, slowest): grid pattern + brand orbs — translate-y 0.1×
- Layer 2 (giữa): HeroDomainArt — translate-y 0.3×
- Layer 3 (gần nhất, fastest): chips/badges floating — translate-y 0.5×

### Refactor `fe/components/sections/hero.tsx`

Đã có scroll-driven `artY` cho HeroDomainArt. Bổ sung 2 lớp:

```tsx
const gridY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -40]);
const artY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -120]);
const chipsY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -180]);
```

Sau đó áp dụng:

```tsx
<motion.div style={{ y: gridY }} className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(var(--vhd-color-primary)_1px,transparent_1px),linear-gradient(90deg,var(--vhd-color-primary)_1px,transparent_1px)] [background-size:48px_48px]" />

<motion.div style={{ y: artY, scale: artScale }} className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] lg:block">
  <HeroDomainArt className="absolute inset-0" />
</motion.div>

{/* Floating chips từ HeroDomainArt với chipsY parallax */}
```

---

## E8 — Sticky scroll storytelling section

### Mục tiêu

Section "How VHD works" — sticky pin trong viewport trong khi user cuộn, content (3-4 step text) cycle qua từng cái. Visual bên cạnh thay đổi (image / illustration).

### Tạo schema type mới `sticky-story` trong `fe/types/site-config.ts`:

```ts
export type StickyStorySection = BaseSection<"sticky-story", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  steps?: {
    title: string;
    description: string;
    icon?: string; // emoji or path
  }[];
}>;
```

Add vào SectionType union + Section union.

### Tạo `fe/components/sections/sticky-story.tsx`

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Headphones, ClipboardList, ShieldCheck, Truck } from "lucide-react";
import type { StickyStorySection } from "@/types/site-config";

const DEFAULT_STEPS = [
  { title: "Lắng nghe", description: "Tư vấn 1-1 miễn phí, hiểu đúng nhu cầu B2B của bạn.", Icon: Headphones },
  { title: "Báo giá rõ ràng", description: "Bảng giá minh bạch, không phụ phí ẩn, ký hợp đồng nhanh.", Icon: ClipboardList },
  { title: "Sản xuất kiểm định", description: "ISO 9001 — kiểm tra chất lượng từng lô trước khi xuất kho.", Icon: ShieldCheck },
  { title: "Giao toàn quốc", description: "Hệ thống logistic 63 tỉnh, theo dõi đơn hàng realtime.", Icon: Truck },
];

export default function StickyStory({ section }: { section: StickyStorySection }) {
  const p = section.props;
  const steps = (p.steps?.length
    ? p.steps.map((s, i) => ({ ...s, Icon: DEFAULT_STEPS[i]?.Icon ?? Headphones }))
    : DEFAULT_STEPS);

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const activeIdx = useTransform(scrollYProgress, [0, 1], [0, steps.length - 1]);

  return (
    <section ref={ref} className="relative" style={{ height: `${steps.length * 100}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-2 lg:gap-16">
          {/* Left text */}
          <div className="max-w-xl self-center">
            <p className="type-eyebrow text-brand-accent">{p.eyebrow ?? "Cách VHD hoạt động"}</p>
            <h2 className="mt-3 type-display-md text-foreground">{p.heading ?? "Bốn bước đến đối tác bền vững"}</h2>
            {p.subheading && <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>}

            <div className="mt-12 space-y-8">
              {steps.map((step, i) => {
                const opacity = useTransform(activeIdx, [i - 0.5, i, i + 0.5], [0.25, 1, 0.25]);
                const x = useTransform(activeIdx, [i - 0.5, i, i + 0.5], [-30, 0, 30]);
                return (
                  <motion.div key={step.title} style={{ opacity, x }} className="flex items-start gap-5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-(--vhd-color-highlight)/15 text-brand-highlight">
                      <step.Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span className="font-mono text-xs font-bold tabular-nums text-brand-primary/60">
                        0{i + 1}
                      </span>
                      <h3 className="mt-1 font-heading text-xl font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right visual that morphs */}
          <div className="relative hidden h-[480px] self-center lg:block">
            {steps.map((step, i) => {
              const opacity = useTransform(activeIdx, [i - 0.5, i, i + 0.5], [0, 1, 0]);
              const scale = useTransform(activeIdx, [i - 0.5, i, i + 0.5], [0.85, 1, 0.85]);
              return (
                <motion.div
                  key={step.title}
                  style={{ opacity, scale }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-foreground/8 bg-card p-12 shadow-[0_30px_80px_-30px_rgba(15,35,86,0.4)]"
                >
                  <span className="grid h-32 w-32 place-items-center rounded-3xl bg-(--vhd-color-primary) text-white">
                    <step.Icon className="h-14 w-14" strokeWidth={1.4} />
                  </span>
                  <span className="mt-6 font-heading text-7xl font-black text-foreground/10 tabular-nums">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">
                    {step.title}
                  </h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Register

- Add `case "sticky-story":` vào `fe/components/sections/index.tsx`.
- Add template + label vào `fe/app/admin/builder/page.tsx`.
- Add vào `defaultHomeSections()` (vị trí sau Process — đẩy comparison-table xuống).

⚠️ **Cẩn thận:** Lenis có thể làm sticky behavior hơi lệch. Test kỹ — nếu cần thêm `data-lenis-prevent` attribute hoặc dùng CSS `position: sticky` thuần.

---

## Thứ tự implement đề xuất

1. **E1 (Smooth scroll)** — tác động toàn site, nâng cấp nền tảng → làm trước.
2. **E6 (Shimmer text)** — CSS only, 5 phút.
3. **E2 (Magnetic buttons)** — 1 component, nhanh, impact cao.
4. **E5 (Blob mesh)** — visual rich, dễ áp dụng.
5. **E3 (Marquee tape)** — chèn giữa sections, tạo nhịp.
6. **E7 (Parallax hero)** — refactor hero hiện có, vừa phải.
7. **E4 (Scroll-drawn handshake)** — rich nhưng phải chỉnh path SVG.
8. **E8 (Sticky storytelling)** — phức tạp nhất, làm cuối.

---

## Test sau mỗi phase

1. `cd fe && yarn tsc --noEmit` — phải pass.
2. Reload `http://localhost:3000` — cuộn từ đầu đến cuối quan sát hiệu ứng.
3. Mobile 390×844 — đảm bảo không vỡ layout, không lag.
4. Test với `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate CSS media feature) — animation phải bỏ qua.

---

## DB script update sau cùng

Tạo `be/prisma/update-config-v5.ts` (nếu thêm `sticky-story` vào homepage):

```ts
// copy v4 và thêm step storytelling vào array sections trước comparison-table
{
  id: "sticky-story-default",
  type: "sticky-story",
  order: 8,
  visible: true,
  props: {
    eyebrow: "Cách VHD hoạt động",
    heading: "Bốn bước đến đối tác bền vững",
    subheading: "Quy trình minh bạch — từ tư vấn đến giao hàng — đảm bảo trải nghiệm B2B nhất quán.",
  },
},
```

Chạy: `cd be && npx ts-node prisma/update-config-v5.ts`.

---

## Tips từ Shopify (capture được)

| Bí quyết | Thực hành |
| --- | --- |
| Easing curve [0.22, 1, 0.36, 1] (out-quart) | Đã dùng toàn V3/V4 — giữ nguyên |
| Stagger delay 0.06-0.1s/item | Đã dùng — giữ |
| `viewport={{ once: true }}` để không animate lại | Mọi `whileInView` phải có |
| `will-change-transform` cho parallax | E7 thêm khi cần |
| `mix-blend-multiply` cho blob | E5 đã dùng |
| Color transition 0.3s on hover | Đã dùng `transition-colors` |
| Cubic-bezier scroll easing | E1 Lenis cung cấp |

---

## Kết quả mong đợi

✅ Toàn site scroll mượt như Shopify (E1).
✅ CTA primary có magnetic effect ở mọi chỗ quan trọng (E2).
✅ Brand marquee tape giữa sections tạo nhịp + lặp tagline (E3).
✅ SVG handshake vẽ dần khi cuộn — biểu tượng đặc trưng VHD (E4).
✅ Background blob mesh sống động ở hero + CTA (E5).
✅ Heading words "nhựa/miến/VHD" có shimmer gradient (E6).
✅ Hero có parallax 3 layer depth (E7).
✅ Sticky storytelling section dạng "How VHD works" (E8).

**Cộng V4: web siêu đẹp, có chiều sâu, nhịp visual rõ ràng — Shopify-level premium B2B.**

---

*Plan này dùng làm input cho Sonnet 4.6. Mỗi phase có code copy-paste sẵn, chỉ cần làm theo thứ tự và test sau mỗi phase.*
