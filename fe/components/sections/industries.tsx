"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import type { IndustriesSection as IndustriesType } from "@/types/site-config";
import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/animations/glow-card";
import { TextReveal } from "@/components/animations/text-reveal";

export const DEFAULT_INDUSTRY_ITEMS = [
  {
    icon: "/images/illustrations/industry-plastic.svg",
    title: "Ống nhựa & Phụ kiện",
    description: "PVC, HDPE, PPR — đầy đủ kích thước D21–D200, tiêu chuẩn TCVN, đa dụng dân dụng & công nghiệp.",
    href: "/categories/ong-nhua-cong-nghiep",
    bullets: ["Tiêu chuẩn TCVN/ISO", "Kho hàng sẵn 2.000m³", "Cắt đúng yêu cầu B2B"],
    accent: "primary" as const,
  },
  {
    icon: "/images/illustrations/industry-rubber.svg",
    title: "Cao su kỹ thuật",
    description: "Tấm cao su NBR, EPDM, SBR — gioăng, ron, đệm chống rung cho nhà máy chế biến và cơ khí chính xác.",
    href: "/categories/nhua-cao-su",
    bullets: ["Chịu dầu, chịu nhiệt", "Đặt theo bản vẽ", "Giao hàng 24h nội thành"],
    accent: "accent" as const,
  },
  {
    icon: "/images/illustrations/industry-noodle.svg",
    title: "Miến truyền thống",
    description:
      "Miến dong làng nghề Quốc Oai, miến gạo Hà Tĩnh — đóng gói tiêu chuẩn, sẵn sàng phân phối siêu thị & xuất khẩu.",
    href: "/categories/thuc-pham-lang-nghe",
    bullets: ["Nguồn nguyên liệu sạch", "OEM/Private label", "Bao bì xuất khẩu chuẩn"],
    accent: "highlight" as const,
  },
];

const ACCENT_BG: Record<string, string> = {
  primary:
    "bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_srgb,var(--vhd-color-primary)_15%,transparent)_0%,transparent_60%),radial-gradient(80%_80%_at_100%_100%,color-mix(in_srgb,var(--vhd-color-accent)_18%,transparent)_0%,transparent_60%)]",
  accent:
    "bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_srgb,var(--vhd-color-accent)_22%,transparent)_0%,transparent_60%),radial-gradient(80%_80%_at_100%_100%,color-mix(in_srgb,var(--vhd-color-primary)_15%,transparent)_0%,transparent_60%)]",
  highlight:
    "bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_srgb,var(--vhd-color-highlight)_22%,transparent)_0%,transparent_60%),radial-gradient(80%_80%_at_100%_100%,color-mix(in_srgb,var(--vhd-color-danger)_12%,transparent)_0%,transparent_60%)]",
  danger:
    "bg-[radial-gradient(120%_120%_at_0%_0%,color-mix(in_srgb,var(--vhd-color-danger)_18%,transparent)_0%,transparent_60%),radial-gradient(80%_80%_at_100%_100%,color-mix(in_srgb,var(--vhd-color-highlight)_15%,transparent)_0%,transparent_60%)]",
};

const ACCENT_BAR: Record<string, string> = {
  primary: "bg-brand-primary",
  accent: "bg-(--vhd-color-accent)",
  highlight: "bg-(--vhd-color-highlight)",
  danger: "bg-(--vhd-color-danger)",
};

export default function IndustriesSection({ section }: { section: IndustriesType }) {
  const p = section.props;
  const items = p.items?.length ? p.items : DEFAULT_INDUSTRY_ITEMS;
  const heading = p.heading ?? "Ba trụ cột kinh doanh của VHD Corp";
  const subheading =
    p.subheading ??
    "Từ vật tư công nghiệp đến đặc sản làng nghề — VHD Corp là đối tác cung ứng đa ngành, kết nối chất lượng Việt Nam với thị trường B2B/B2C.";

  const cardRefs = useRef<HTMLDivElement[]>([]);
  const prefersReduce = useReducedMotion();

  useEffect(() => {
    if (prefersReduce) return;
    const handlers: { el: HTMLDivElement; mm: (e: MouseEvent) => void; ml: () => void }[] = [];
    cardRefs.current.forEach((el) => {
      if (!el) return;
      const mm = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
      };
      const ml = () => {
        el.style.setProperty("--mx", `50%`);
        el.style.setProperty("--my", `50%`);
      };
      el.addEventListener("mousemove", mm);
      el.addEventListener("mouseleave", ml);
      handlers.push({ el, mm, ml });
    });
    return () => {
      handlers.forEach(({ el, mm, ml }) => {
        el.removeEventListener("mousemove", mm);
        el.removeEventListener("mouseleave", ml);
      });
    };
  }, [prefersReduce]);

  return (
    <section className="relative isolate overflow-hidden bg-background py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(60%_50%_at_15%_10%,color-mix(in_srgb,var(--vhd-color-accent)_12%,transparent)_0%,transparent_70%),radial-gradient(45%_45%_at_85%_90%,color-mix(in_srgb,var(--vhd-color-highlight)_10%,transparent)_0%,transparent_70%)]"
      />
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 max-w-3xl"
        >
          <p className="type-eyebrow text-brand-primary">Lĩnh vực kinh doanh</p>
          <TextReveal as="h2" className="mt-3 type-display-md text-foreground">
            {heading}
          </TextReveal>
          <p className="mt-4 type-lead text-foreground/65 max-w-[58ch]">{subheading}</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const accent = it.accent ?? "primary";
            return (
              <GlowCard key={`${it.title}-${i}`}>
                <motion.div
                  ref={(el) => {
                    if (el) cardRefs.current[i] = el;
                  }}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={
                    {
                      "--mx": "50%",
                      "--my": "50%",
                    } as React.CSSProperties
                  }
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-foreground/8 p-7 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(15,35,86,0.12)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_24px_48px_-20px_rgba(15,35,86,0.30)]",
                    ACCENT_BG[accent]
                  )}
                >
                  {/* Spotlight follows cursor */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(220px circle at var(--mx) var(--my), color-mix(in srgb, var(--vhd-color-accent) 22%, transparent), transparent 75%)",
                    }}
                  />

                  {/* Color accent bar */}
                  <div className={cn("absolute left-0 top-7 h-12 w-1.5 rounded-r-full", ACCENT_BAR[accent])} />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-background/70 ring-1 ring-foreground/5 backdrop-blur">
                      {it.icon ? (
                        <Image
                          src={it.icon}
                          alt={it.title}
                          width={88}
                          height={88}
                          className="h-16 w-16 object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-brand-primary/10" />
                      )}
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10 bg-background/70 text-foreground/55 transition-all group-hover:border-brand-primary/40 group-hover:bg-brand-primary group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4 -rotate-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>

                  <h3 className="relative mt-6 text-xl font-heading font-bold text-foreground">{it.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-foreground/65">{it.description}</p>

                  {it.bullets && it.bullets.length > 0 && (
                    <ul className="relative mt-5 space-y-2">
                      {it.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-foreground/75">
                          <span
                            className={cn(
                              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-white",
                              ACCENT_BAR[accent]
                            )}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {it.href && (
                    <Link
                      href={it.href}
                      className="relative mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary transition-colors group-hover:text-(--vhd-color-primary) dark:text-foreground"
                    >
                      Khám phá danh mục
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  )}
                </motion.div>
              </GlowCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
