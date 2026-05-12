"use client";

import { BrandMarquee } from "@/components/animations/brand-marquee";
import { ScrollVelocityRow } from "@/components/animations/scroll-velocity-row";

/** E3 — Brand marquee + Shopify-style scroll-velocity ribbon */
export function HomeMarquees() {
  return (
    <>
      <BrandMarquee variant="primary" />
      <section
        aria-hidden
        className="relative overflow-hidden border-y border-foreground/10 bg-linear-to-r from-brand-primary/5 via-transparent to-brand-accent/5 py-10"
      >
        <ScrollVelocityRow baseVelocity={28}>
          <span className="font-heading text-4xl font-black uppercase tracking-tight text-foreground/85 md:text-6xl lg:text-7xl">
            Kết nối giá trị
            <span className="mx-6 inline-block text-brand-highlight">✦</span>
            Hợp tác vững bền
            <span className="mx-6 inline-block text-brand-accent">✦</span>
            Tổng kho VHD Corp
            <span className="mx-6 inline-block text-brand-primary">✦</span>
          </span>
        </ScrollVelocityRow>
        <ScrollVelocityRow baseVelocity={-22} className="mt-2 opacity-60">
          <span className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground/55 md:text-5xl">
            Ống nhựa PVC · Cao su kỹ thuật · Miến làng nghề · B2B/B2C · Giao toàn quốc
          </span>
        </ScrollVelocityRow>
      </section>
      <BrandMarquee variant="highlight" duration={50} />
    </>
  );
}
