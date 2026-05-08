"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Play,
  ShieldCheck,
  Truck,
  Sparkles,
} from "lucide-react";
import type { HeroSection as HeroSectionType } from "@/types/site-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSiteConfigStore } from "@/store/site-config.store";
import { cn } from "@/lib/utils";
import { HeroDomainArt } from "@/components/animations/hero-domain-art";

function AnimatedHeading({ text, className }: { text: string; className?: string }) {
  // Tách từ theo whitespace, hỗ trợ cú pháp *từ* để admin highlight (cho phép có dấu câu kèm sau).
  const segments = text.split(" ");
  return (
    <h1 className={className}>
      {segments.map((rawWord, i) => {
        const m = /^\*([^*]+?)\*([,.;:!?…]*)$/.exec(rawWord);
        const isMarked = !!m;
        const word = m ? m[1] : rawWord;
        const suffix = m ? m[2] : "";
        return (
          <motion.span
            key={i}
            suppressHydrationWarning
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block mr-[0.22em]"
          >
            <span className={cn(isMarked && "word-highlight rounded-sm")}>{word}</span>
            {suffix}
          </motion.span>
        );
      })}
    </h1>
  );
}

export default function HeroSection({ section }: { section: HeroSectionType }) {
  const p = section.props;
  const align = p.align ?? "left";
  const minH = p.minHeight ?? 720;
  const config = useSiteConfigStore((s) => s.config);
  const brand = config?.brand;
  const prefersReduce = useReducedMotion();
  const [videoOpen, setVideoOpen] = useState(false);

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

  const heading = p.heading ?? "Tổng kho *nhựa*, cao su & *miến* truyền thống Việt";
  const subheading =
    p.subheading ??
    "VHD Corp — tổng kho ống nhựa PVC, tấm cao su kỹ thuật và miến làng nghề chất lượng cao. Đặt hàng B2B/B2C, giao nhanh toàn quốc.";

  const trustItems = [
    { icon: ShieldCheck, label: "Cam kết chất lượng", desc: "Kiểm định ISO 9001" },
    { icon: Truck, label: "Giao hàng toàn quốc", desc: "B2B/B2C 24h nội thành" },
    { icon: Sparkles, label: "12+ năm kinh nghiệm", desc: "850+ sản phẩm cung cấp" },
  ];

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-background">
      {/* User-provided background image (optional) */}
      {p.bgImage && (
        <>
          <div ref={bgRef} aria-hidden className="absolute inset-0 -z-20 bg-cover bg-center" />
          <div ref={overlayRef} aria-hidden className="absolute inset-0 -z-10 bg-brand-primary" />
        </>
      )}

      {!p.bgImage && (
        <>
          {/* Animated brand-coded soft mesh */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.92 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute inset-0 -z-30 [background:radial-gradient(60%_55%_at_85%_20%,color-mix(in_srgb,var(--vhd-color-accent)_22%,transparent)_0%,transparent_70%),radial-gradient(45%_45%_at_15%_80%,color-mix(in_srgb,var(--vhd-color-highlight)_18%,transparent)_0%,transparent_70%),radial-gradient(40%_30%_at_50%_5%,color-mix(in_srgb,var(--vhd-color-primary)_10%,transparent)_0%,transparent_60%)]"
          />

          {/* Floating brand orbs (very subtle) */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4, x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -left-40 top-1/3 -z-20 h-105 w-105 rounded-full bg-(--vhd-color-accent)/15 blur-3xl"
          />
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35, x: [0, -16, 0], y: [0, 14, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="pointer-events-none absolute -right-32 -bottom-20 -z-20 h-120 w-120 rounded-full bg-(--vhd-color-highlight)/14 blur-3xl"
          />

          {/* Domain illustration: ống nhựa + cao su + miến (parallax on scroll) */}
          <motion.div
            style={{ y: artY, scale: artScale }}
            className="absolute inset-y-0 right-0 -z-10 hidden w-[58%] lg:block"
          >
            <HeroDomainArt className="absolute inset-0" />
          </motion.div>

          {/* Subtle grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(var(--vhd-color-primary)_1px,transparent_1px),linear-gradient(90deg,var(--vhd-color-primary)_1px,transparent_1px)] [background-size:48px_48px]"
          />
        </>
      )}

      <motion.div
        ref={containerRef}
        style={{ opacity: heroFade }}
        className={cn(
          "container relative z-10 mx-auto flex flex-col gap-7 px-4",
          align === "center" && "items-center text-center",
          align === "right" && "items-end text-right",
        )}
      >
        {/* Eyebrow brand chip */}
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-(--vhd-color-primary)/15 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur dark:bg-white/5"
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
            <span className="grid h-5 w-5 place-items-center rounded-sm bg-(--vhd-color-primary) text-[10px] font-bold text-white">
              V
            </span>
          )}
          <span className="text-xs font-semibold tracking-wide text-foreground/80">
            <span className="font-bold text-brand-primary dark:text-foreground">VHD Corp</span>
            <span className="mx-1 text-foreground/30">·</span>
            <span className="font-bold uppercase tracking-[0.12em] text-brand-primary/85 dark:text-foreground/70">
              {brand?.tagline ?? "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"}
            </span>
          </span>
          <span className="ml-1 inline-flex h-4 items-center rounded-full bg-(--vhd-color-highlight)/20 px-1.5 text-[10px] font-bold text-brand-highlight">
            B2B
          </span>
        </motion.div>

        <AnimatedHeading
          text={heading}
          className={cn(
            "type-display-xl max-w-[18ch] font-heading",
            p.bgImage ? "text-white" : "text-brand-primary dark:text-foreground",
          )}
        />

        {subheading && (
          <motion.p
            suppressHydrationWarning
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className={cn(
              "type-lead max-w-[58ch]",
              p.bgImage ? "text-white/85" : "text-foreground/70",
            )}
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
            <Button
              asChild
              size="lg"
              className="group h-12 rounded-full bg-(--vhd-color-primary) px-7 text-base font-semibold text-white shadow-[0_10px_30px_-10px_color-mix(in_srgb,var(--vhd-color-primary)_60%,transparent)] hover:bg-(--vhd-color-primary)/95"
            >
              <Link href={p.ctaLink}>
                <span className="flex items-center gap-2">
                  {p.ctaText}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-(--vhd-color-primary)/30 bg-transparent px-7 text-base font-semibold text-brand-primary hover:bg-(--vhd-color-primary)/8 dark:text-foreground"
            >
              <Link href="/contact">Liên hệ tư vấn</Link>
            </Button>
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
                className="group/trust relative flex items-center gap-3 overflow-hidden rounded-xl border border-foreground/8 bg-white/55 p-3 shadow-sm backdrop-blur transition-all hover:border-(--vhd-color-primary)/20 hover:bg-white/70 dark:bg-white/5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 -bottom-px h-px scale-x-0 bg-(--vhd-color-primary)/40 transition-transform group-hover/trust:scale-x-100"
                />
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vhd-color-highlight)/15 text-brand-highlight transition-colors group-hover/trust:bg-(--vhd-color-highlight)/30">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{it.label}</p>
                  <p className="text-xs text-foreground/55">{it.desc}</p>
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
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-foreground/40"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
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
