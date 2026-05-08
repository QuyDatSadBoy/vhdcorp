"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Play } from "lucide-react";
import type { FeatureShowcaseSection } from "@/types/site-config";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function FeatureShowcase({ section }: { section: FeatureShowcaseSection }) {
  const p = section.props;
  const imageSide = p.imageSide ?? "right";
  const [open, setOpen] = useState(false);

  const embedUrl = p.videoUrl?.includes("youtube.com/watch?v=")
    ? p.videoUrl.replace("watch?v=", "embed/") + "?autoplay=1&rel=0"
    : p.videoUrl?.includes("youtu.be/")
      ? p.videoUrl.replace("youtu.be/", "youtube.com/embed/") + "?autoplay=1&rel=0"
      : p.videoUrl;

  return (
    <section className="relative overflow-hidden py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <div
          className={cn(
            "grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16",
            imageSide === "left" && "lg:[&>*:first-child]:order-2",
          )}
        >
          {/* Text column */}
          <motion.div
            suppressHydrationWarning
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            {p.badge && (
              <span className="mb-4 inline-flex items-center rounded-full bg-(--vhd-color-highlight)/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-highlight">
                {p.badge}
              </span>
            )}
            {p.eyebrow && <p className="type-eyebrow text-brand-accent">{p.eyebrow}</p>}
            <h2 className="mt-3 type-display-md text-foreground">{p.heading}</h2>
            {p.subheading && (
              <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>
            )}
            {p.bullets && p.bullets.length > 0 && (
              <ul className="mt-7 space-y-3">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-foreground/80">
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-(--vhd-color-primary)/10 text-brand-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.ctaText && p.ctaLink && (
              <Link
                href={p.ctaLink}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--vhd-color-primary)/90"
              >
                {p.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>

          {/* Media column */}
          <motion.div
            suppressHydrationWarning
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-video overflow-hidden rounded-3xl border border-foreground/8 bg-card shadow-[0_18px_60px_-30px_rgba(15,35,86,0.4)]"
          >
            {p.thumbnailUrl ? (
              <Image
                src={p.thumbnailUrl}
                alt={p.heading}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 [background:radial-gradient(80%_80%_at_50%_30%,color-mix(in_srgb,var(--vhd-color-accent)_38%,transparent),transparent),radial-gradient(80%_80%_at_50%_100%,color-mix(in_srgb,var(--vhd-color-primary)_50%,transparent),transparent)]">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3 text-white/85">
                    <span className="font-heading text-3xl font-black uppercase tracking-[0.3em]">VHD</span>
                    <span className="text-xs font-bold uppercase tracking-[0.16em]">Showcase Video</span>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
              </div>
            )}
            {p.videoUrl && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Phát video showcase"
                className="absolute inset-0 grid place-items-center bg-black/15 transition-colors hover:bg-black/25"
              >
                <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-primary shadow-xl transition-transform duration-300 group-hover:scale-110 hover:scale-110">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </span>
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {p.videoUrl && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton
            className="max-w-4xl border-none bg-black p-0"
          >
            <DialogTitle className="sr-only">Video showcase {p.heading}</DialogTitle>
            <div className="aspect-video w-full">
              {open && embedUrl && (
                <iframe
                  src={embedUrl}
                  title={p.heading}
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
