"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { BannerSliderSection as Section } from "@/types/site-config";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBanners } from "@/services/banner.service";

export default function BannerSlider({ section }: { section: Section }) {
  const p = section.props;
  // Nguồn "banners": lấy slide từ Quản trị → Banner theo vị trí (đổi banner không cần sửa layout)
  const fromBanners = p.source === "banners";
  const bannersQ = useBanners(fromBanners ? p.bannerPosition || "home-hero" : undefined);
  const slides: { image?: string; link?: string; alt?: string; title?: string; caption?: string }[] = fromBanners
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

  return (
    <section ref={sectionRef}>
      <div className="container mx-auto px-4">
        {/* Nền trung tính (không phải xanh thương hiệu) — mọi slide đều xếp chồng và
            đã tải sẵn nên chuyển slide là cross-fade mượt, không "chớp xanh" chờ ảnh. */}
        <div className="relative aspect-21/9 w-full overflow-hidden rounded-2xl bg-muted">
          {slides.map((s, i) => {
            const active = i === idx;
            const media = s.image ? (
              <Image
                src={s.image}
                alt={s.alt ?? ""}
                fill
                // Slide đầu ưu tiên (LCP); các slide sau vẫn nằm trong khung nên tải sớm,
                // sẵn sàng để cross-fade không giật.
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 [background:radial-gradient(90%_90%_at_15%_20%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent),transparent),radial-gradient(90%_90%_at_100%_100%,color-mix(in_srgb,var(--vhd-color-primary)_75%,transparent),transparent)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:44px_44px]" />
              </div>
            );

            return (
              <div
                key={i}
                aria-hidden={!active}
                className={
                  "absolute inset-0 transition-[opacity,transform] duration-700 ease-out will-change-[opacity] " +
                  (active ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]")
                }
              >
                {s.image && s.link ? (
                  <Link href={s.link} className="absolute inset-0">
                    {media}
                  </Link>
                ) : (
                  media
                )}

                {/* Lớp chữ giới thiệu — admin nhập tiêu đề & mô tả cho từng slide */}
                {(s.title || s.caption) && (
                  <div className="pointer-events-none absolute inset-0 flex items-end bg-linear-to-t from-black/70 via-black/25 to-transparent p-6 md:p-12">
                    <div className="max-w-2xl">
                      {s.title && (
                        <h3 className="font-heading text-2xl font-black tracking-tight text-white md:text-4xl">
                          {s.title}
                        </h3>
                      )}
                      {s.caption && (
                        <p className="mt-2 max-w-xl text-sm text-white/85 md:mt-3 md:text-base">{s.caption}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {slides.length > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => setIdx((i) => (i + 1) % slides.length)}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
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
