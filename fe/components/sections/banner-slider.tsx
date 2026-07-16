"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { BannerSliderSection as Section } from "@/types/site-config";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/services/banner.service";

export default function BannerSlider({ section }: { section: Section }) {
  const p = section.props;
  // Nguồn "banners": lấy slide từ Quản trị → Banner theo vị trí (đổi banner không cần sửa layout)
  const fromBanners = p.source === "banners";
  const bannersQ = useBanners(fromBanners ? p.bannerPosition || "home-hero" : undefined);
  const slides = fromBanners
    ? (bannersQ.data ?? []).map((b) => ({ image: b.imageUrl, link: b.link ?? undefined, alt: b.alt ?? undefined }))
    : (p.slides ?? []);
  const [idx, setIdx] = useState(0);
  const interval = p.interval ?? 5000;
  const autoplay = p.autoplay ?? true;
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!autoplay || slides.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(id);
  }, [autoplay, interval, slides.length]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 0}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 0}px`;
  }, [p.paddingTop, p.paddingBottom]);

  if (slides.length === 0) return null;
  const cur = slides[idx];

  return (
    <section ref={sectionRef}>
      <div className="container mx-auto px-4">
        <div className="relative aspect-21/9 w-full overflow-hidden rounded-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              suppressHydrationWarning
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              {cur.link ? (
                <Link href={cur.link}>
                  <Image src={cur.image} alt={cur.alt ?? ""} fill priority sizes="100vw" className="object-cover" />
                </Link>
              ) : (
                <Image src={cur.image} alt={cur.alt ?? ""} fill priority sizes="100vw" className="object-cover" />
              )}
            </motion.div>
          </AnimatePresence>

          {slides.length > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-foreground shadow backdrop-blur transition hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => setIdx((i) => (i + 1) % slides.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-foreground shadow backdrop-blur transition hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setIdx(i)}
                    className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-2 bg-white/60"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
