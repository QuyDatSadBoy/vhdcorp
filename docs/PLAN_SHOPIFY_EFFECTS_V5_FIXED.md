# PLAN V5 FIXED — Hiệu ứng Shopify cho VHD Corp

**Gốc:** `PLAN_SHOPIFY_EFFECTS_V5.md` — đã review + fix 3 lỗi nghiêm trọng + bổ sung 2 effects.
**Người triển khai:** Sonnet 4.6

---

## ⚠️ Quy tắc bất di bất dịch (giữ nguyên từ V5)

1. **KHÔNG phá V4** — chỉ thêm hiệu ứng.
2. **`prefers-reduced-motion`** — dùng `useReducedMotion()`.
3. **Brand colors only** — CSS vars `var(--vhd-color-primary/accent/highlight/danger)`.
4. **Mobile fallback** — heavy effects → fade-in đơn giản trên mobile.
5. **Test sau mỗi phase** — `yarn tsc --noEmit` + browser verify.
6. **Tagline đầy đủ** — không động vào.

---

## Thứ tự implement

1. E1 (Lenis) → 2. E6 (Shimmer) → 3. E2 (Magnetic) → 4. E5 (Blob) → 5. E3 (Marquee) → 6. E7 (Parallax) → 7. E4 (SVG draw) → 8. E8 (Sticky story)

---

## E1 — Smooth scroll (Lenis) — GIỮU NGUYÊN

**Không thay đổi so với V5 gốc.** Copy nguyên code từ `PLAN_SHOPIFY_EFFECTS_V5.md` phần E1.

Tóm tắt:
1. `cd fe && yarn add lenis`
2. Tạo `fe/components/animations/lenis-provider.tsx`
3. Mount vào `fe/app/(client)/layout.tsx` — bọc `<LenisProvider>` quanh children
4. Thêm CSS `.lenis` vào `globals.css`

---

## E2 — Magnetic CTA buttons — GIỮU NGUYÊN

**Không thay đổi so với V5 gốc.** Copy nguyên code.

Tóm tắt:
1. Tạo `fe/components/animations/magnetic-button.tsx`
2. Bọc CTA primary trong hero, contact-cta, feature-showcase

---

## E3 — Marquee brand tape — GIỮU NGUYÊN

**Không thay đổi so với V5 gốc.** Copy nguyên code.

Tóm tắt:
1. Tạo `fe/components/animations/brand-marquee.tsx`
2. Chèn `<BrandMarquee />` giữa các sections trong `page.tsx`

---

## E4 — Scroll-drawn SVG handshake — GIỮU NGUYÊN

**Không thay đổi so với V5 gốc.** Copy nguyên code.

---

## E5 — Blob mesh — 🔧 FIX DARK MODE

### Lỗi gốc
`mix-blend-multiply` biến mất trên dark background (multiply × #000 = #000).

### Code đã fix — `fe/components/animations/blob-mesh.tsx`

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
        className="absolute -left-20 top-0 h-[60%] w-[55%] rounded-full bg-(--vhd-color-accent)/40 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: speed, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-20 top-1/4 h-[65%] w-[60%] rounded-full bg-(--vhd-color-highlight)/30 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, -70, 50, 0], y: [0, 60, -40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: speed * 1.2, ease: "easeInOut", repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute left-1/3 -bottom-20 h-[55%] w-[55%] rounded-full bg-(--vhd-color-primary)/35 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.92, 1] }}
        transition={{ duration: speed * 1.4, ease: "easeInOut", repeat: Infinity, delay: 2 }}
      />
      <motion.div
        className="absolute right-1/4 bottom-0 h-[40%] w-[40%] rounded-full bg-(--vhd-color-danger)/25 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, -30, 40, 0], y: [0, 30, -20, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: speed * 1.6, ease: "easeInOut", repeat: Infinity, delay: 3 }}
      />
    </div>
  );
}
```

**Thay đổi:** Thêm `dark:mix-blend-screen` cho mọi blob div.

---

## E6 — Shimmer gradient text — GIỮU NGUYÊN

**Không thay đổi so với V5 gốc.** CSS-only, thêm vào `globals.css`.

---

## E7 — Parallax multi-layer hero — 🔧 FIX CONFLICT VỚI THREE.JS

### Lỗi gốc
Hero đã có `hero-3d.tsx` (Three.js Canvas) + `hero-domain-art.tsx` + scroll parallax cho `artY/artScale`. Thêm parallax layers có thể conflict.

### Hướng fix
**KHÔNG refactor hero-3d.tsx.** Chỉ thêm parallax cho 2 layer decorative đã có:

1. **Grid pattern** (line 152-155 trong hero.tsx) → thêm `motion.div` + `useTransform` y nhẹ
2. **Trust strip chips** (line 257-285) → không cần parallax, giữ nguyên

Code fix — chỉ sửa grid pattern trong `hero.tsx`:

```tsx
// Đã có sẵn:
const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
const artY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -80]);

// THÊM MỚI:
const gridY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -40]);
```

Rồi wrap grid div (line 152) bằng `motion.div`:

```tsx
{/* Subtle grid — giờ có parallax nhẹ */}
<motion.div
  aria-hidden
  style={{ y: gridY }}
  className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(var(--vhd-color-primary)_1px,transparent_1px),linear-gradient(90deg,var(--vhd-color-primary)_1px,transparent_1px)] [background-size:48px_48px]"
/>
```

**⚠️ KHÔNG CHẠM VÀO `hero-3d.tsx` hay `HeroDomainArt`.** Canvas Three.js đã có parallax riêng qua `artY`.

---

## E8 — Sticky scroll storytelling — 🚨 FIX CRITICAL HOOKS BUG

### Lỗi gốc
Code V5 gốc gọi `useTransform()` bên trong `steps.map()` — vi phạm React Rules of Hooks → **crash runtime**.

### Code đã fix — `fe/components/sections/sticky-story.tsx`

```tsx
"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Headphones, ClipboardList, ShieldCheck, Truck } from "lucide-react";
import type { StickyStorySection } from "@/types/site-config";

const ICONS = [Headphones, ClipboardList, ShieldCheck, Truck];

const DEFAULT_STEPS = [
  { title: "Lắng nghe", description: "Tư vấn 1-1 miễn phí, hiểu đúng nhu cầu B2B của bạn." },
  { title: "Báo giá rõ ràng", description: "Bảng giá minh bạch, không phụ phí ẩn, ký hợp đồng nhanh." },
  { title: "Sản xuất kiểm định", description: "ISO 9001 — kiểm tra chất lượng từng lô trước khi xuất kho." },
  { title: "Giao toàn quốc", description: "Hệ thống logistic 63 tỉnh, theo dõi đơn hàng realtime." },
];

/** Helper component cho từng step — giữ hooks ở top-level */
function StepText({
  step,
  index,
  activeIdx,
}: {
  step: { title: string; description: string };
  index: number;
  activeIdx: MotionValue<number>;
}) {
  const opacity = useTransform(activeIdx, [index - 0.5, index, index + 0.5], [0.25, 1, 0.25]);
  const x = useTransform(activeIdx, [index - 0.5, index, index + 0.5], [-30, 0, 30]);
  const Icon = ICONS[index] ?? Headphones;

  return (
    <motion.div style={{ opacity, x }} className="flex items-start gap-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-(--vhd-color-highlight)/15 text-brand-highlight">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <span className="font-mono text-xs font-bold tabular-nums text-brand-primary/60">
          0{index + 1}
        </span>
        <h3 className="mt-1 font-heading text-xl font-bold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground/65">{step.description}</p>
      </div>
    </motion.div>
  );
}

/** Helper component cho visual card bên phải */
function StepVisual({
  step,
  index,
  activeIdx,
}: {
  step: { title: string };
  index: number;
  activeIdx: MotionValue<number>;
}) {
  const opacity = useTransform(activeIdx, [index - 0.5, index, index + 0.5], [0, 1, 0]);
  const scale = useTransform(activeIdx, [index - 0.5, index, index + 0.5], [0.85, 1, 0.85]);
  const Icon = ICONS[index] ?? Headphones;

  return (
    <motion.div
      style={{ opacity, scale }}
      className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-foreground/8 bg-card p-12 shadow-[0_30px_80px_-30px_rgba(15,35,86,0.4)]"
    >
      <span className="grid h-32 w-32 place-items-center rounded-3xl bg-(--vhd-color-primary) text-white">
        <Icon className="h-14 w-14" strokeWidth={1.4} />
      </span>
      <span className="mt-6 font-heading text-7xl font-black text-foreground/10 tabular-nums">
        0{index + 1}
      </span>
      <h3 className="mt-2 font-heading text-2xl font-bold text-foreground">{step.title}</h3>
    </motion.div>
  );
}

export default function StickyStory({ section }: { section: StickyStorySection }) {
  const p = section.props;
  const steps = p.steps?.length ? p.steps : DEFAULT_STEPS;

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
              {steps.map((step, i) => (
                <StepText key={step.title} step={step} index={i} activeIdx={activeIdx} />
              ))}
            </div>
          </div>

          {/* Right visual */}
          <div className="relative hidden h-[480px] self-center lg:block">
            {steps.map((step, i) => (
              <StepVisual key={step.title} step={step} index={i} activeIdx={activeIdx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Thay đổi chính:** Tách `useTransform` vào `StepText` và `StepVisual` components riêng biệt — hooks giờ ở top-level của component, **không trong loop**. React Rules of Hooks: ✅

### Register sticky-story

1. Thêm type `"sticky-story"` vào `SectionType` union ở `fe/types/site-config.ts`
2. Thêm `StickyStorySection` interface + union
3. Thêm `case "sticky-story":` vào `fe/components/sections/index.tsx`
4. Thêm template + label vào `fe/app/admin/builder/page.tsx`
5. Thêm vào `defaultHomeSections()` (order 8, sau process)

⚠️ **Cẩn thận:** Lenis + sticky có thể conflict. Test kỹ — nếu sticky lệch, thêm `data-lenis-prevent` attribute.

---

## E9 (BỔ SUNG) — Cursor glow effect

### Mục tiêu
Subtle radial glow theo vị trí cursor trên hero section. Rất premium, lightweight.

### Tạo `fe/components/animations/cursor-glow.tsx`

```tsx
"use client";

import { useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

export function CursorGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      ref.current.style.setProperty("--glow-x", `${x}px`);
      ref.current.style.setProperty("--glow-y", `${y}px`);
      ref.current.style.setProperty("--glow-opacity", "1");
    },
    [reduce],
  );

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.setProperty("--glow-opacity", "0");
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${className ?? ""}`}
      style={{
        background: `radial-gradient(400px circle at var(--glow-x, 50%) var(--glow-y, 50%), color-mix(in srgb, var(--vhd-color-accent) 12%, transparent), transparent 60%)`,
        opacity: "var(--glow-opacity, 0)",
      }}
      aria-hidden
    />
  );
}
```

### Sử dụng

Trong hero.tsx, thêm `pointer-events-auto` wrapper:

```tsx
<div className="pointer-events-auto absolute inset-0 -z-5">
  <CursorGlow />
</div>
```

---

## E10 (BỔ SUNG) — Section entrance stagger refined

### Mục tiêu
Đảm bảo MỌI section grid (industries, use-cases, featured-products) có stagger delay đồng nhất.

### Cách làm
Tạo shared animation variants trong `fe/lib/motion-variants.ts`:

```ts
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};
```

Áp dụng cho mọi grid section:
```tsx
<motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>...</motion.div>
  ))}
</motion.div>
```

---

## DB Script

Tạo `be/prisma/update-config-v5.ts` nếu thêm `sticky-story` vào homepage:

```ts
{
  id: "sticky-story-default",
  type: "sticky-story",
  order: 8,
  visible: true,
  props: {
    eyebrow: "Cách VHD hoạt động",
    heading: "Bốn bước đến đối tác bền vững",
    subheading: "Quy trình minh bạch — từ tư vấn đến giao hàng.",
  },
},
```

---

## Tóm tắt thay đổi so với V5 gốc

| Item | V5 gốc | V5 Fixed |
|---|---|---|
| E5 blob-mesh | `mix-blend-multiply` only | + `dark:mix-blend-screen` |
| E7 parallax | Thêm 3 layers mới | Chỉ thêm parallax cho grid, KHÔNG chạm hero-3d |
| E8 sticky-story | `useTransform` trong `.map()` ❌ | Tách thành `StepText`/`StepVisual` components ✅ |
| E9 cursor glow | Không có | **MỚI** — CSS radial-gradient theo cursor |
| E10 stagger | Không có | **MỚI** — Shared motion variants |

---

*Plan này dùng làm input cho Sonnet 4.6. Fix xong, sẵn sàng code.*
