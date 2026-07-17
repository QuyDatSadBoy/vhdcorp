"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ClipboardList, Headphones, Package, Truck, ShieldCheck } from "lucide-react";
import type { ProcessSection as ProcessType } from "@/types/site-config";

export const DEFAULT_PROCESS_STEPS = [
  {
    title: "Tư vấn nhu cầu",
    description: "Đội ngũ chuyên viên lắng nghe yêu cầu, đề xuất sản phẩm và phương án tối ưu chi phí.",
    icon: Headphones,
  },
  {
    title: "Báo giá & hợp đồng",
    description: "Báo giá rõ ràng, ký hợp đồng B2B/B2C, đảm bảo tiến độ giao hàng và bảo hành chuyên nghiệp.",
    icon: ClipboardList,
  },
  {
    title: "Sản xuất & kiểm định",
    description: "Sản phẩm sản xuất theo TCVN/ISO, kiểm định chất lượng tại kho trước khi xuất hàng.",
    icon: ShieldCheck,
  },
  {
    title: "Đóng gói chuyên nghiệp",
    description: "Đóng gói cẩn thận, chắc chắn, bảo vệ trong quá trình vận chuyển, hỗ trợ private label.",
    icon: Package,
  },
  {
    title: "Giao hàng toàn quốc",
    description: "Hệ thống logistic 63 tỉnh, theo dõi đơn hàng realtime, giao đúng hẹn hoặc hoàn tiền.",
    icon: Truck,
  },
];

export default function ProcessSection({ section }: { section: ProcessType }) {
  const p = section.props;
  const steps = p.steps?.length
    ? p.steps.map((s, i) => ({
        ...s,
        icon: DEFAULT_PROCESS_STEPS[i]?.icon ?? ClipboardList,
      }))
    : DEFAULT_PROCESS_STEPS;

  const heading = p.heading ?? "Quy trình hợp tác chuẩn hoá";
  const subheading =
    p.subheading ??
    "Năm bước minh bạch — từ tư vấn đến hậu mãi — đảm bảo trải nghiệm B2B/B2C nhất quán cho mọi khách hàng VHD.";

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 20%"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative isolate overflow-hidden bg-background py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(50%_40%_at_90%_10%,color-mix(in_srgb,var(--vhd-color-accent)_15%,transparent)_0%,transparent_75%)]"
      />
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <p className="type-eyebrow text-brand-primary">Quy trình</p>
          <h2 className="mt-3 type-display-md text-foreground">{heading}</h2>
          <p className="mt-4 type-lead text-foreground/65">{subheading}</p>
        </motion.div>

        <div ref={ref} className="relative grid gap-10 md:grid-cols-2 md:gap-x-16 lg:gap-x-24">
          {/* Vertical timeline line */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-foreground/10 md:block"
          />
          <motion.div
            aria-hidden
            style={{ height: lineHeight }}
            className="pointer-events-none absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-(--vhd-color-accent) via-(--vhd-color-primary) to-(--vhd-color-highlight) md:block"
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: isLeft ? -28 : 28, y: 18 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`relative ${isLeft ? "md:col-start-1 md:pr-10 md:text-right" : "md:col-start-2 md:pl-10"} ${i > 0 ? "md:-mt-16" : ""}`}
              >
                {/* Dot on timeline */}
                <div
                  className={`absolute top-7 hidden h-4 w-4 rounded-full border-4 border-background bg-brand-primary shadow-md md:block ${
                    isLeft ? "right-[-2.5rem] translate-x-1/2" : "left-[-2.5rem] -translate-x-1/2"
                  }`}
                />

                <div className="rounded-3xl border border-foreground/8 bg-card p-7 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-16px_rgba(15,35,86,0.18)] transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-[0_18px_40px_-20px_rgba(15,35,86,0.28)]">
                  <div className={`flex items-center gap-3 ${isLeft ? "md:flex-row-reverse" : ""}`}>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-(--vhd-color-highlight)/14 text-brand-highlight">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-heading text-3xl font-black text-foreground/15 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold font-heading text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
