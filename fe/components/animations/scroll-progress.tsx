"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * ScrollProgress — thanh tiến độ scroll mượt ở top trang, brand gradient.
 * Dán vào client layout (sticky + z-50, nằm trên header).
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 24,
    mass: 0.4,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 bg-linear-to-r from-brand-primary via-brand-accent to-brand-highlight shadow-[0_0_12px_rgba(79,184,231,0.45)]"
    />
  );
}
