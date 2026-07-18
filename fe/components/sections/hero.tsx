"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown, Play, ShieldCheck, Truck, Sparkles } from "lucide-react";
import type { HeroSection as HeroSectionType } from "@/types/site-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSiteConfigStore } from "@/store/site-config.store";
import { cn } from "@/lib/utils";
import { HeroDomainArt } from "@/components/animations/hero-domain-art";
import { MagneticButton } from "@/components/animations/magnetic-button";
import { CursorGlow } from "@/components/animations/cursor-glow";
import { ParticlesCSS } from "@/components/animations/particles-css";

// WebGL shader canvas: lazy + ssr:false để tránh bundle three vào server.
const AuroraShaderCanvas = dynamic(
  () => import("@/components/animations/aurora-shader-canvas").then((m) => m.AuroraShaderCanvas),
  { ssr: false, loading: () => null }
);

// Hero 3D scene — Shopify Editions inspired floating glass primitives.
const Hero3DScene = dynamic(() => import("@/components/animations/hero-3d-scene").then((m) => m.Hero3DScene), {
  ssr: false,
  loading: () => null,
});

function AnimatedHeading({
  text,
  className,
  color,
  highlightColor,
  style,
}: {
  text: string;
  className?: string;
  color?: string;
  highlightColor?: string;
  style?: CSSProperties;
}) {
  // Cú pháp *từ* hoặc *nhiều từ* để admin highlight. Tách theo cặp dấu * trước,
  // rồi mới tách từng từ (giữ animation theo từ); dấu câu liền sau *…* dính vào từ cuối.
  const tokens: { word: string; marked: boolean; suffix: string }[] = [];
  for (const part of text.split(/(\*[^*]+\*)/g)) {
    const m = /^\*([^*]+)\*$/.exec(part);
    if (m) {
      for (const w of m[1].trim().split(/\s+/).filter(Boolean)) tokens.push({ word: w, marked: true, suffix: "" });
      continue;
    }
    let rest = part;
    const pm = /^([,.;:!?…]+)/.exec(rest);
    if (pm && tokens.length) {
      tokens[tokens.length - 1].suffix += pm[1];
      rest = rest.slice(pm[1].length);
    }
    for (const w of rest.trim().split(/\s+/).filter(Boolean)) tokens.push({ word: w, marked: false, suffix: "" });
  }
  return (
    <h1 className={className} style={{ ...(color ? { color } : undefined), ...style }}>
      {tokens.map(({ word, marked: isMarked, suffix }, i) => {
        return (
          <motion.span
            key={i}
            suppressHydrationWarning
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block mr-[0.22em]"
          >
            <span
              className={cn(isMarked && !highlightColor && "text-shimmer-brand rounded-sm")}
              style={isMarked && highlightColor ? { color: highlightColor } : undefined}
            >
              {word}
            </span>
            {suffix}
          </motion.span>
        );
      })}
    </h1>
  );
}

/** Chip cam kết mặc định — seed vào props layout mẫu để admin sửa được trong builder */
export const DEFAULT_HERO_TRUST_ITEMS = [
  { label: "Cam kết chất lượng", desc: "Hàng đúng mô tả, rõ nguồn gốc" },
  { label: "Giao hàng toàn quốc", desc: "Hỗ trợ cả khách lẻ & doanh nghiệp" },
  { label: "Tư vấn tận tâm", desc: "Phản hồi nhanh trong giờ làm việc" },
];

export default function HeroSection({ section }: { section: HeroSectionType }) {
  const p = section.props;
  const align = p.align ?? "left";
  const minH = p.minHeight ?? 100; // U1: default min 100vh-like (sẽ dùng min-h-screen)
  const config = useSiteConfigStore((s) => s.config);
  const brand = config?.brand;
  const prefersReduce = useReducedMotion();
  const [videoOpen, setVideoOpen] = useState(false);

  // Hiệu ứng NẶNG (WebGL aurora + 3D three.js) CHỈ bật trên desktop rộng + không
  // giảm chuyển động. Mobile/low-end/reduced-motion → không mount → chunk three.js
  // KHÔNG tải, không chạy vòng render GPU → hết lag. Desktop vẫn đẹp.
  const [heavyFx, setHeavyFx] = useState(false);
  useEffect(() => {
    if (prefersReduce) return;
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const apply = () => setHeavyFx(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [prefersReduce]);

  const heroEmbedUrl = p.videoUrl?.includes("youtube.com/watch?v=")
    ? p.videoUrl.replace("watch?v=", "embed/") + "?autoplay=1&rel=0"
    : p.videoUrl?.includes("youtu.be/")
      ? p.videoUrl.replace("youtu.be/", "youtube.com/embed/") + "?autoplay=1&rel=0"
      : p.videoUrl;

  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax for the right-side art
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -80]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, prefersReduce ? 1 : 1.05]);
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0.6]);
  // E7 — parallax cho grid pattern
  const gridY = useTransform(scrollYProgress, [0, 1], [0, prefersReduce ? 0 : -40]);

  useEffect(() => {
    if (sectionRef.current) sectionRef.current.style.minHeight = `${minH}px`;
  }, [minH]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.paddingTop = `${p.paddingTop ?? 96}px`;
      containerRef.current.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
    }
  }, [p.paddingTop, p.paddingBottom]);

  useEffect(() => {
    if (overlayRef.current) overlayRef.current.style.opacity = String(p.overlayOpacity ?? 0.55);
  }, [p.overlayOpacity]);

  useEffect(() => {
    if (bgRef.current && p.bgImage) bgRef.current.style.backgroundImage = `url(${p.bgImage})`;
  }, [p.bgImage]);

  const heading = p.heading ?? "Kho tổng *vật tư điện lạnh*, cơ điện & *khuôn mẫu* đúc nhựa";
  const subheading =
    p.subheading ??
    "VHD Corp — kho tổng vật tư điện lạnh, cơ điện (M&E) và nhà sản xuất khuôn mẫu, đúc nhựa. Đặt hàng B2B/B2C, giao nhanh toàn quốc.";

  // Chip cam kết: admin sửa trong builder (icon xoay vòng theo thứ tự)
  const TRUST_ICONS = [ShieldCheck, Truck, Sparkles];
  const trustItems = (p.trustItems?.length ? p.trustItems : DEFAULT_HERO_TRUST_ITEMS).map((it, i) => ({
    ...it,
    icon: TRUST_ICONS[i % TRUST_ICONS.length],
  }));

  return (
    // -mt-16 md:-mt-20: kéo hero lên sau sticky header trong suốt (h-16/h-20)
    // để dark background lấp đầy phần header trong suốt, không để trắng lộ ra
    <section ref={sectionRef} className="relative isolate overflow-hidden min-h-screen -mt-16 md:-mt-20">
      {/* ====== BASE DARK BACKGROUND — aurora sẽ glow lên trên nền tối này ====== */}
      <div aria-hidden className="absolute inset-0 -z-40 bg-[#050c1a]" />

      {/* User-provided background image (optional) */}
      {p.bgImage && (
        <>
          <div ref={bgRef} aria-hidden className="absolute inset-0 -z-20 bg-cover bg-center" />
          <div ref={overlayRef} aria-hidden className="absolute inset-0 -z-10 bg-brand-primary" />
        </>
      )}

      {!p.bgImage && (
        <>
          {/* WebGL/3D chỉ mount khi heavyFx (desktop rộng, không reduced-motion).
              Mobile/low-end → dùng nền CSS gradient nhẹ bên dưới, không tải three.js. */}
          {heavyFx && (
            <>
              {/* WebGL mesh-gradient aurora — tone NAVY + CYAN của logo VHD. */}
              <AuroraShaderCanvas className="-z-30" intensity={0.85} />
              {/* 3D R3F scene — floating glass primitives, parallax theo chuột. */}
              <Hero3DScene className="-z-15 left-auto right-0 hidden w-[55%] lg:block" />
            </>
          )}
          {/* Nền gradient CSS nhẹ (luôn có) — đẹp trên mọi thiết bị, 0 chi phí GPU đáng kể */}
          {!heavyFx && (
            <div
              aria-hidden
              className="absolute inset-0 -z-30 bg-[radial-gradient(120%_120%_at_15%_10%,color-mix(in_srgb,var(--vhd-color-primary)_55%,transparent),transparent_60%),radial-gradient(120%_120%_at_85%_90%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent),transparent_55%)]"
            />
          )}

          {/* Readability scrim — gradient tối ở rìa trái + đáy để text luôn đọc được.
              Pointer-events:none → không chặn cursor warp. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_left_center,rgba(4,10,24,0.6)_0%,rgba(4,10,24,0.25)_45%,rgba(4,10,24,0.0)_75%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-1/3 bg-linear-to-t from-[#040a18]/85 via-[#040a18]/30 to-transparent"
          />

          {/* E9 — Cursor glow */}
          <CursorGlow className="-z-25" />

          {/* U6 — CSS Particles */}
          <ParticlesCSS className="-z-15 opacity-60" />

          {/* Grain noise — depth & premium feel */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-5 opacity-[0.06] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.75%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20filter%3D%22url(%23n)%22%20opacity%3D%221%22%2F%3E%3C%2Fsvg%3E')] mix-blend-overlay"
          />

          {/* Subtle grid with parallax — white on dark */}
          <motion.div
            aria-hidden
            style={{ y: gridY }}
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-size-[60px_60px]"
          />

          {/* Domain illustration SVG — subtle backdrop, 3D scene là main focal */}
          <motion.div
            style={{ y: artY, scale: artScale }}
            className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] opacity-30 lg:block"
          >
            <HeroDomainArt className="absolute inset-0" />
          </motion.div>
        </>
      )}

      <motion.div
        ref={containerRef}
        style={{ opacity: heroFade }}
        className={cn(
          "container relative z-10 mx-auto flex flex-col gap-7 px-4",
          align === "center" && "items-center text-center",
          align === "right" && "items-end text-right"
        )}
      >
        {/* Eyebrow brand chip */}
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-1.5 shadow-lg backdrop-blur-md"
        >
          {brand?.logo?.url ? (
            <Image
              src={brand.logo.url}
              alt={brand.siteName ?? "VHD Corp"}
              width={20}
              height={20}
              className="h-5 w-5 rounded-sm object-contain"
              priority
            />
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-sm bg-brand-primary text-[10px] font-bold text-white">
              V
            </span>
          )}
          <span className="text-xs font-semibold tracking-wide text-white/80">
            <span className="font-bold text-white">VHD Corp</span>
            <span className="mx-1 text-white/25">·</span>
            <span className="font-semibold uppercase tracking-[0.12em] text-white/55">
              {brand?.tagline ?? "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"}
            </span>
          </span>
          {(p.badge ?? "B2B") && (
            <span className="ml-1 inline-flex h-4 items-center rounded-full bg-(--vhd-color-highlight)/25 px-1.5 text-[10px] font-bold text-brand-highlight">
              {p.badge ?? "B2B"}
            </span>
          )}
        </motion.div>

        <AnimatedHeading
          text={heading}
          color={p.headingColor}
          highlightColor={p.highlightColor}
          style={{
            // Chữ HOA tiếng Việt có dấu cần giãn dòng ≥1.15 — inline để thắng
            // line-height 1.02 của .type-display-xl (hết "dòng dưới chồng dòng trên").
            lineHeight: p.headingLineHeight || 1.15,
            ...(p.headingSizePx ? { fontSize: `clamp(28px, 9vw, ${p.headingSizePx}px)` } : undefined),
            ...(p.headingLetterSpacing ? { letterSpacing: `${p.headingLetterSpacing}px` } : undefined),
          }}
          className={cn(
            "max-w-[20ch] font-heading font-black tracking-tight",
            !p.headingColor && "text-white",
            !p.headingSizePx &&
              {
                sm: "text-4xl md:text-5xl",
                md: "text-5xl md:text-6xl",
                lg: "text-6xl md:text-7xl",
                xl: "type-display-xl",
              }[p.headingSize ?? "xl"]
          )}
        />

        {subheading && (
          <motion.p
            suppressHydrationWarning
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className={cn("type-lead max-w-[58ch]", !p.subheadingColor && "text-white/70")}
            style={{
              ...(p.subheadingSizePx ? { fontSize: `clamp(14px, 4vw, ${p.subheadingSizePx}px)` } : undefined),
              ...(p.subheadingColor ? { color: p.subheadingColor } : undefined),
            }}
          >
            {subheading}
          </motion.p>
        )}

        {p.ctaText && p.ctaLink && (
          <motion.div
            suppressHydrationWarning
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.7 }}
            className="flex flex-wrap items-center gap-4"
          >
            {/* E2 — Magnetic CTA buttons */}
            <MagneticButton strength={0.3}>
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-full bg-brand-primary px-7 text-base font-semibold text-white shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--vhd-color-primary)_60%,transparent)] hover:bg-brand-primary/95 animate-cta-glow"
              >
                <Link href={p.ctaLink}>
                  <span className="flex items-center gap-2">
                    {p.ctaText}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
            </MagneticButton>
            <MagneticButton strength={0.2}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/25 bg-transparent px-7 text-base font-semibold text-white hover:bg-white/10"
              >
                <Link href="/contact">Liên hệ tư vấn</Link>
              </Button>
            </MagneticButton>
          </motion.div>
        )}

        {/* Trust strip */}
        <motion.ul
          suppressHydrationWarning
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {trustItems.map((it) => {
            const Icon = it.icon;
            return (
              <li
                key={it.label}
                className="group/trust relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/8"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 -bottom-px h-px scale-x-0 bg-brand-accent/60 transition-transform group-hover/trust:scale-x-100"
                />
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vhd-color-highlight)/20 text-brand-highlight transition-colors group-hover/trust:bg-(--vhd-color-highlight)/35">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{it.label}</p>
                  <p className="text-xs text-white/50">{it.desc}</p>
                </div>
              </li>
            );
          })}
        </motion.ul>

        {/* Mobile/tablet hero video preview (desktop có HeroDomainArt riêng) */}
        {p.videoUrl && (
          <motion.div
            suppressHydrationWarning
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-6 lg:hidden"
          >
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              aria-label="Phát video showcase nhà máy VHD"
              className="group relative block aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-[0_18px_60px_-30px_rgba(15,35,86,0.4)]"
            >
              {p.videoThumbnail ? (
                <Image
                  src={p.videoThumbnail}
                  alt="Video preview"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 [background:radial-gradient(80%_80%_at_50%_30%,color-mix(in_srgb,var(--vhd-color-accent)_38%,transparent),transparent),radial-gradient(80%_80%_at_50%_100%,color-mix(in_srgb,var(--vhd-color-primary)_50%,transparent),transparent)]">
                  <div className="absolute inset-0 grid place-items-center text-white/85">
                    <span className="font-heading text-2xl font-black uppercase tracking-[0.3em]">VHD</span>
                  </div>
                </div>
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/15 transition-colors group-hover:bg-black/25">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-brand-primary shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/35"
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>

      {p.videoUrl && (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent showCloseButton className="max-w-4xl border-none bg-black p-0">
            <DialogTitle className="sr-only">Video showcase VHD Corp</DialogTitle>
            <div className="aspect-video w-full">
              {videoOpen && heroEmbedUrl && (
                <iframe
                  src={heroEmbedUrl}
                  title="VHD Corp Showcase"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
