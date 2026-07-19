"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import type { ContactCtaSection as Section } from "@/types/site-config";
import { useSiteConfigStore } from "@/store/site-config.store";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/animations/reveal";

export default function ContactCta({ section }: { section: Section }) {
  const p = section.props;
  const config = useSiteConfigStore((s) => s.config);
  // Hotline đọc từ SiteConfig — ẩn nút gọi nếu admin chưa cấu hình
  const hotline = config?.footer?.contact?.hotline || config?.footer?.contact?.phone || "";
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.background = p.bgColor ?? "var(--vhd-color-primary)";
  }, [p.bgColor]);

  const heading = p.heading ?? "Sẵn sàng hợp tác cùng VHD Corp?";
  const body =
    p.body ??
    "Để lại thông tin — đội ngũ tư vấn của VHD sẽ liên hệ trong vòng 24 giờ với báo giá và mẫu sản phẩm phù hợp nhu cầu doanh nghiệp của bạn.";
  const ctaText = p.ctaText ?? "Liên hệ ngay";
  const ctaLink = p.ctaLink ?? "/contact";

  return (
    <section ref={sectionRef} className="container mx-auto px-4">
      <Reveal>
        <motion.div
          ref={cardRef}
          suppressHydrationWarning
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="border-beam relative isolate overflow-hidden rounded-3xl p-8 text-white shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--vhd-color-primary)_70%,transparent)] md:p-14"
        >
          {/* Brand orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-accent/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-brand-highlight/25 blur-3xl"
          />
          {/* Subtle handshake-inspired arc decoration */}
          <svg
            aria-hidden
            className="pointer-events-none absolute right-6 top-6 h-32 w-32 text-white/10 md:h-44 md:w-44"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="50" cy="50" r="42" />
            <path d="M14 60 Q50 100 86 60" strokeWidth="3" />
            <path d="M14 40 Q50 0 86 40" strokeWidth="3" />
          </svg>

          <div className="relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl space-y-4">
              <p className="type-eyebrow text-brand-highlight">Hợp tác cùng chúng tôi</p>
              <h2 className="type-display-md text-white">{heading}</h2>
              <p className="text-white/80 md:text-lg">{body}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-full bg-brand-highlight px-7 text-base font-semibold text-brand-primary hover:brightness-95 [a]:hover:bg-brand-highlight"
              >
                <Link href={ctaLink}>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {ctaText}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
              {hotline && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/30 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
                >
                  <Link href={`tel:${hotline.replace(/\s+/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Gọi tư vấn
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}
