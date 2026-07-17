"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { UseCasesSection } from "@/types/site-config";
import { cn } from "@/lib/utils";

export const DEFAULT_USE_CASES: NonNullable<UseCasesSection["props"]["cases"]> = [
  {
    emoji: "📦",
    title: "Đặt hàng B2B số lượng lớn",
    description: "Đặt từ 100 sản phẩm trở lên với giá cạnh tranh, hợp đồng dài hạn, công nợ linh hoạt.",
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
  const cases = p.cases?.length ? p.cases : DEFAULT_USE_CASES;
  const cols = p.columns ?? 4;

  return (
    <section className="relative bg-(--vhd-color-surface)/40 dark:bg-white/[0.03] py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          {p.eyebrow && <p className="type-eyebrow text-brand-primary">{p.eyebrow}</p>}
          <h2 className="mt-3 type-display-md text-foreground">{p.heading}</h2>
          {p.subheading && <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>}
        </motion.div>

        <div className={cn("grid gap-5 sm:grid-cols-2", cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          {cases.map((c, i) => (
            <motion.div
              key={`${c.title}-${i}`}
              suppressHydrationWarning
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col rounded-2xl border border-foreground/8 bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-[0_18px_40px_-20px_rgba(15,35,86,0.28)]"
            >
              {c.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-(--vhd-color-highlight)/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-highlight">
                  {c.badge}
                </span>
              )}
              {/* emoji chấp nhận cả URL ảnh (admin upload từ builder) */}
              {c.emoji && (c.emoji.startsWith("/") || c.emoji.startsWith("http")) ? (
                <span className="relative block h-12 w-12" aria-hidden>
                  <Image src={c.emoji} alt="" fill sizes="48px" className="object-contain" />
                </span>
              ) : (
                <span className="text-4xl leading-none" aria-hidden>
                  {c.emoji}
                </span>
              )}
              <h3 className="mt-4 font-heading text-base font-bold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">{c.description}</p>
              {c.href && (
                <Link
                  href={c.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary transition-all group-hover:gap-2"
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
