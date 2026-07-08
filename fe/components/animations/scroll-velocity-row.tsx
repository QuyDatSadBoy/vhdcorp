"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useScroll,
  useSpring,
  useVelocity,
  useAnimationFrame,
} from "framer-motion";

/**
 * ScrollVelocityRow — text marquee chạy theo velocity của scroll.
 * Càng cuộn nhanh → text trượt nhanh + đảo chiều theo hướng cuộn.
 * Inspired by Shopify Editions hero ribbons.
 */
export function ScrollVelocityRow({
  children,
  baseVelocity = 40,
  className,
}: {
  children: React.ReactNode;
  baseVelocity?: number;
  className?: string;
}) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });

  const directionFactor = useRef<number>(1);
  const wrap = (min: number, max: number, v: number) => {
    const range = max - min;
    return ((((v - min) % range) + range) % range) + min;
  };
  const x = useTransform(baseX, (v) => `${wrap(-25, -75, v)}%`);

  useAnimationFrame((_, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className={`relative overflow-x-clip overflow-y-visible whitespace-nowrap ${className ?? ""}`}>
      <motion.div className="flex flex-nowrap whitespace-nowrap will-change-transform" style={{ x }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="mx-8 inline-block">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/**
 * NoiseOverlay — film grain mịn full-screen, fixed, blend-mode overlay.
 * Tăng cảm giác premium, "Renaissance painterly" như Shopify Editions.
 */
export function NoiseOverlay({ opacity = 0.04 }: { opacity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.opacity = String(opacity);
  }, [opacity]);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-1 mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')]"
    />
  );
}
