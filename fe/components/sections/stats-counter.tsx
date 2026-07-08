"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, motion } from "framer-motion";
import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import type { StatsCounterSection as Section } from "@/types/site-config";

function Counter({ value, unit }: { value: number; unit?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      setV(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span
      ref={ref}
      className="block font-heading text-5xl font-extrabold tracking-tight text-brand-highlight md:text-7xl"
      style={{ fontFeatureSettings: '"tnum" 1' }}
    >
      {v.toLocaleString("vi-VN")}
      {unit ? <span className="ml-1 align-top text-3xl text-white/85 md:text-4xl">{unit}</span> : null}
    </span>
  );
}

/**
 * Procedurally generate a smooth ascending sparkline (12 months trend).
 * Deterministic per `seed` to keep SSR/CSR aligned.
 */
function useSparklineData(seed: number, count = 12) {
  return useMemo(() => {
    const out: number[] = [];
    let v = 30 + ((seed * 7) % 30);
    for (let i = 0; i < count; i += 1) {
      const drift = ((seed * (i + 3)) % 13) - 5;
      v = Math.max(8, Math.min(98, v + drift + i * 1.6));
      out.push(v);
    }
    return out;
  }, [seed, count]);
}

function Sparkline({ seed, idx }: { seed: number; idx: number }) {
  const data = useSparklineData(seed);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - v;
    return [x, y] as const;
  });
  const pathD = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const fillD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <svg ref={ref} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="mt-5 h-14 w-full opacity-90">
      <defs>
        <linearGradient id={`sg${idx}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={fillD}
        fill={`url(#sg${idx})`}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.6 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="#F5A623"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />
      {/* End dot */}
      <motion.circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={1.6}
        fill="#fff"
        stroke="#F5A623"
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        initial={{ scale: 0 }}
        animate={inView ? { scale: 1 } : {}}
        transition={{ duration: 0.4, delay: 1.6 }}
      />
    </svg>
  );
}

export default function StatsCounter({ section }: { section: Section }) {
  const p = section.props;
  const stats = p.stats ?? [];
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  if (stats.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden scan-lines text-white">
      {/* Solid brand-primary base */}
      <div aria-hidden className="absolute inset-0 -z-30 bg-brand-primary" />
      {/* Soft accent radial */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 [background:radial-gradient(70%_60%_at_85%_30%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent)_0%,transparent_70%),radial-gradient(50%_45%_at_15%_80%,color-mix(in_srgb,var(--vhd-color-highlight)_30%,transparent)_0%,transparent_70%)]"
      />
      {/* Grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-size-[48px_48px]"
      />
      {/* U6 — Noise texture depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-5 bg-noise-texture opacity-[0.04]" />

      <div className="container mx-auto px-4">
        <Reveal className="mb-12 max-w-2xl">
          <p className="type-eyebrow text-white/60">Con số biết nói</p>
          <TextReveal as="h2" className="mt-3 type-display-md text-white">
            {p.heading ?? "Tin cậy bởi hàng trăm đối tác Việt"}
          </TextReveal>
          <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                suppressHydrationWarning
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative border-t border-white/15 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
              >
                <Counter value={s.value} unit={s.unit} />
                <p className="mt-3 text-sm font-medium text-white/80">{s.label}</p>
                <Sparkline seed={s.value || i + 1} idx={i} />
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-white/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight animate-pulse" />
                  Tăng trưởng 12 tháng gần nhất
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
