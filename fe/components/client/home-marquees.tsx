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
        className="relative overflow-hidden border-y border-foreground/10 bg-linear-to-r from-brand-primary/5 via-transparent to-brand-accent/5 py-14 md:py-20"
      >
        <ScrollVelocityRow baseVelocity={28} className="py-1">
          <span className="font-heading text-3xl font-black uppercase leading-tight tracking-tight text-foreground/85 md:text-5xl lg:text-6xl">
            Kết nối giá trị
            <span className="mx-6 inline-block text-brand-highlight">✦</span>
            Hợp tác vững bền
            <span className="mx-6 inline-block text-brand-accent">✦</span>
            Tổng kho VHD Corp
            <span className="mx-6 inline-block text-brand-primary">✦</span>
          </span>
        </ScrollVelocityRow>
        <ScrollVelocityRow baseVelocity={-22} className="mt-8 py-1 opacity-60 md:mt-10">
          <span className="font-heading text-2xl font-bold uppercase leading-tight tracking-tight text-foreground/55 md:text-4xl">
            Ống nhựa PVC · Cao su kỹ thuật · Miến làng nghề · B2B/B2C · Giao toàn quốc
          </span>
        </ScrollVelocityRow>
      </section>
      <BrandMarquee variant="highlight" duration={50} />
    </>
  );
}
