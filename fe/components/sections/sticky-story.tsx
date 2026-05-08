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

/** Hooks ở top-level of component — không vi phạm Rules of Hooks */
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
        <span className="font-mono text-xs font-bold tabular-nums text-brand-primary/60">0{index + 1}</span>
        <h3 className="mt-1 font-heading text-xl font-bold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground/65">{step.description}</p>
      </div>
    </motion.div>
  );
}

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
      <span className="grid h-32 w-32 place-items-center rounded-3xl bg-brand-primary text-white">
        <Icon className="h-14 w-14" strokeWidth={1.4} />
      </span>
      <span className="mt-6 font-heading text-7xl font-black text-foreground/10 tabular-nums">0{index + 1}</span>
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
