"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { TestimonialsSection as Section } from "@/types/site-config";
import { Reveal } from "@/components/animations/reveal";
import { AuroraBg } from "@/components/animations/aurora-bg";

export default function Testimonials({ section }: { section: Section }) {
  const p = section.props;
  const quotes = useMemo(() => p.quotes ?? [], [p.quotes]);
  const [idx, setIdx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!p.autoplay || quotes.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % quotes.length), 6500);
    return () => clearInterval(id);
  }, [p.autoplay, quotes.length]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  const next = () => setIdx((i) => (i + 1) % quotes.length);
  const prev = () => setIdx((i) => (i - 1 + quotes.length) % quotes.length);

  // Build "wing" preview cards for prev/next testimonial
  const wings = useMemo(() => {
    if (quotes.length < 2) return null;
    const prevIdx = (idx - 1 + quotes.length) % quotes.length;
    const nextIdx = (idx + 1) % quotes.length;
    return { prev: quotes[prevIdx], next: quotes[nextIdx] };
  }, [idx, quotes]);

  if (quotes.length === 0) return null;
  const q = quotes[idx];

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Aurora background — premium depth */}
      <AuroraBg className="-z-20" intensity="subtle" />
      {/* Decorative giant quote shape behind */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-12 -z-10 -translate-x-1/2 select-none font-heading text-[14rem] font-black leading-none text-(--vhd-color-primary)/4 md:text-[20rem]"
      >
        &ldquo;
      </div>

      <div className="container mx-auto px-4">
        <Reveal className="mx-auto mb-10 max-w-3xl text-center">
          <p className="type-eyebrow text-brand-primary">Khách hàng nói gì</p>
          <h2 className="mt-3 type-display-md text-foreground">Đối tác Việt Nam tin tưởng VHD Corp</h2>
          <p className="mt-3 type-lead text-foreground/65">
            Hàng trăm doanh nghiệp đã chọn VHD làm đối tác cung ứng dài hạn — chất lượng đo bằng sự gắn bó.
          </p>
        </Reveal>

        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <div className="relative grid gap-4 lg:grid-cols-[1fr_2.6fr_1fr] lg:items-center">
              {/* Left wing preview (prev quote) */}
              <button
                type="button"
                onClick={prev}
                aria-label="Đánh giá trước"
                className="group hidden cursor-pointer rounded-2xl border border-foreground/8 bg-card p-5 text-left opacity-60 transition-all hover:opacity-100 hover:-translate-y-0.5 lg:block"
              >
                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/70">
                  &ldquo;{wings?.prev.quote}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <ChevronLeft className="h-3.5 w-3.5 text-brand-accent transition-transform group-hover:-translate-x-0.5" />
                  <span className="font-semibold text-foreground/70">{wings?.prev.name}</span>
                </div>
              </button>

              {/* Main featured testimonial card — glass-premium */}
              <div className="relative overflow-hidden rounded-3xl border border-foreground/10 glass-premium grain-overlay p-7 shadow-[0_32px_80px_-24px_color-mix(in_srgb,var(--vhd-color-primary)_40%,transparent)] md:p-10">
                {/* Brand accent bar on top */}
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-accent via-brand-primary to-brand-highlight" />

                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-(--vhd-color-highlight)/15 text-brand-highlight">
                    <Quote className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="flex gap-0.5 text-brand-highlight">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.blockquote
                    key={idx}
                    suppressHydrationWarning
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6 font-heading text-xl font-medium leading-snug text-foreground md:text-2xl"
                  >
                    &ldquo;{q.quote}&rdquo;
                  </motion.blockquote>
                </AnimatePresence>

                <div className="mt-8 flex items-center gap-4">
                  {q.avatar ? (
                    <Image
                      src={q.avatar}
                      alt={q.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-highlight/40 ring-offset-2"
                    />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-primary text-lg font-bold text-white ring-2 ring-brand-highlight/40 ring-offset-2">
                      {q.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{q.name}</p>
                    {(q.role || q.company) && (
                      <p className="text-sm text-foreground/60">{[q.role, q.company].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right wing preview (next quote) */}
              <button
                type="button"
                onClick={next}
                aria-label="Đánh giá tiếp theo"
                className="group hidden cursor-pointer rounded-2xl border border-foreground/8 bg-card p-5 text-left opacity-60 transition-all hover:opacity-100 hover:-translate-y-0.5 lg:block"
              >
                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/70">
                  &ldquo;{wings?.next.quote}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground/70">{wings?.next.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-brand-accent transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            </div>

            {/* Mobile arrows + dots */}
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={prev}
                aria-label="Đánh giá trước"
                className="grid h-10 w-10 place-items-center rounded-full border border-foreground/10 bg-card text-foreground/70 transition-colors hover:border-brand-primary/40 hover:text-foreground lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {quotes.length > 1 && (
                <div className="flex items-center gap-2">
                  {quotes.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-label={`Đánh giá ${i + 1}`}
                      className={
                        "h-1.5 rounded-full transition-all " +
                        (i === idx ? "w-8 bg-brand-primary" : "w-2 bg-foreground/15 hover:bg-foreground/30")
                      }
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={next}
                aria-label="Đánh giá tiếp theo"
                className="grid h-10 w-10 place-items-center rounded-full border border-foreground/10 bg-card text-foreground/70 transition-colors hover:border-brand-primary/40 hover:text-foreground lg:hidden"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
