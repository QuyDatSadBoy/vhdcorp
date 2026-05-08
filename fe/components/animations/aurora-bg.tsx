"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  className?: string;
  /**
   * Cường độ hiệu ứng.
   * "subtle" → sections sáng / nhẹ
   * "medium" → sections tối
   * "vivid" → hero full-screen (dark bg)
   */
  intensity?: "subtle" | "medium" | "vivid";
}

/**
 * Aurora conic-gradient — 4 lớp quay ngược chiều nhau, màu sắc sống động.
 * Trên nền tối (#050c1a) sẽ rực rỡ như Shopify Winter 2026.
 */
export function AuroraBg({ className, intensity = "medium" }: Props) {
  const reduce = useReducedMotion();

  // Opacity cao hơn để màu rực rỡ trên nền tối
  const opMap = { subtle: 0.5, medium: 0.72, vivid: 1 };
  const op = opMap[intensity];

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      {/* Layer 1 — conic lớn, xanh navy → sky blue, quay CW */}
      <motion.div
        className="absolute left-[-30%] top-[-40%] h-[110%] w-[90%] will-change-transform"
        style={{
          background: `conic-gradient(
            from 200deg at 55% 50%,
            #1B3A8C 0deg,
            #4FB8E7 72deg,
            #0f2461 144deg,
            #22d3ee 200deg,
            #1B3A8C 260deg,
            #4FB8E7 320deg,
            #1B3A8C 360deg
          )`,
          opacity: op * 0.85,
          filter: "blur(90px)",
          borderRadius: "50%",
        }}
        animate={reduce ? {} : { rotate: [0, 360], scale: [1, 1.06, 0.97, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Layer 2 — conic nhỏ hơn, amber → rose, quay CCW */}
      <motion.div
        className="absolute right-[-15%] top-[-5%] h-[70%] w-[60%] will-change-transform"
        style={{
          background: `conic-gradient(
            from 30deg at 50% 50%,
            #F5A623 0deg,
            transparent 55deg,
            #7c3aed 120deg,
            transparent 180deg,
            #F5A623 250deg,
            transparent 300deg,
            #F5A623 360deg
          )`,
          opacity: op * 0.6,
          filter: "blur(75px)",
          borderRadius: "50%",
        }}
        animate={reduce ? {} : { rotate: [360, 0], scale: [1, 0.94, 1.08, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />

      {/* Layer 3 — orb teal/cyan bottom-left, lắc lư */}
      <motion.div
        className="absolute bottom-[-10%] left-[10%] h-[55%] w-[55%] will-change-transform"
        style={{
          background: `radial-gradient(ellipse at center,
            #22d3ee 0%,
            #0891b2 35%,
            transparent 70%
          )`,
          opacity: op * 0.45,
          filter: "blur(70px)",
          borderRadius: "50%",
        }}
        animate={reduce ? {} : { x: [0, 50, -30, 0], y: [0, -25, 20, 0], scale: [1, 1.15, 0.92, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Layer 4 — orb warm highlight top-center */}
      <motion.div
        className="absolute top-[-5%] left-[35%] h-[40%] w-[35%] will-change-transform"
        style={{
          background: `radial-gradient(ellipse at center,
            #F5A623 0%,
            #c47e10 40%,
            transparent 70%
          )`,
          opacity: op * 0.3,
          filter: "blur(60px)",
          borderRadius: "50%",
        }}
        animate={reduce ? {} : { x: [0, -20, 30, 0], scale: [1, 0.88, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Vignette — cạnh tối hơn để nội dung nổi bật */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_45%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}
