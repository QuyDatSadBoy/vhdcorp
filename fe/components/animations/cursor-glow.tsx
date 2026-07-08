"use client";

import { useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

/** Subtle radial glow hiệu ứng theo cursor trên section — premium feel */
export function CursorGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduce || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      ref.current.style.setProperty("--glow-x", `${x}px`);
      ref.current.style.setProperty("--glow-y", `${y}px`);
      ref.current.style.setProperty("--glow-opacity", "1");
    },
    [reduce]
  );

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.setProperty("--glow-opacity", "0");
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`pointer-events-auto absolute inset-0 transition-opacity duration-500 ${className ?? ""}`}
      style={{
        background: `radial-gradient(400px circle at var(--glow-x, 50%) var(--glow-y, 50%), color-mix(in srgb, var(--vhd-color-accent) 12%, transparent), transparent 60%)`,
        opacity: "var(--glow-opacity, 0)",
      }}
      aria-hidden
    />
  );
}
