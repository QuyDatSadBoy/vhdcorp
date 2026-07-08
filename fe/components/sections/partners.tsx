"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Building2, Factory, ShoppingBag, Truck, Wheat, Wrench } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import type { PartnersSection as Section } from "@/types/site-config";

const PLACEHOLDER_BRANDS = [
  { name: "Sài Gòn Water", icon: Building2 },
  { name: "Đông Nam Mech", icon: Factory },
  { name: "DMK Foods", icon: ShoppingBag },
  { name: "VietPlast", icon: Wrench },
  { name: "Quốc Oai Coop", icon: Wheat },
  { name: "VHD Logistics", icon: Truck },
];

export default function Partners({ section }: { section: Section }) {
  const p = section.props;
  const logos = p.logos ?? [];
  const useFallback = logos.length === 0;
  const track = !useFallback ? [...logos, ...logos] : null;

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 80}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 80}px`;
  }, [p.paddingTop, p.paddingBottom]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const duration = p.speed ?? 30;
    el.style.animationDuration = `${duration}s`;
  }, [p.speed]);

  return (
    <section ref={sectionRef} className="overflow-hidden border-y border-border/40 bg-muted/30">
      <Reveal>
        <div className="mb-10 text-center">
          <p className="type-eyebrow text-brand-primary">Đối tác tin cậy</p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {p.heading ?? "Hơn 120+ doanh nghiệp đồng hành cùng VHD"}
          </h2>
        </div>
      </Reveal>

      {useFallback ? (
        // Static premium grid for placeholder when admin chưa có logo
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {PLACEHOLDER_BRANDS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex h-24 items-center justify-center gap-2.5 rounded-2xl border border-foreground/8 bg-card px-4 text-foreground/55 transition-all hover:-translate-y-0.5 hover:border-brand-primary/30 hover:bg-card hover:text-foreground hover:shadow-md"
                >
                  <Icon className="h-5 w-5 transition-colors group-hover:text-brand-primary" strokeWidth={1.6} />
                  <span className="font-heading text-sm font-bold tracking-tight">{b.name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-linear-to-r from-background to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-linear-to-l from-background to-transparent"
          />

          <div ref={trackRef} className="flex w-max animate-marquee gap-14 py-2">
            {track!.map((l, i) => {
              const img = (
                <Image
                  src={l.image}
                  alt={l.name}
                  width={140}
                  height={56}
                  className={`h-10 w-auto object-contain transition-all duration-300 hover:scale-110 ${p.grayscale ? "grayscale opacity-50 hover:grayscale-0 hover:opacity-100" : ""}`}
                />
              );
              return (
                <div key={`${l.name}-${i}`} className="flex shrink-0 items-center justify-center">
                  {l.link ? (
                    <a href={l.link} target="_blank" rel="noopener noreferrer" aria-label={l.name}>
                      {img}
                    </a>
                  ) : (
                    img
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
