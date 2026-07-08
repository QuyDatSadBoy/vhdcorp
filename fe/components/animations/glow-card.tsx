"use client";

import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Tốc độ rotate gradient border (giây) */
  speed?: number;
  /** Intensity glow khi hover (opacity 0-1) */
  glowIntensity?: number;
}

/**
 * Card có animated gradient border glow — conic-gradient rotate 360°.
 * Hover → glow mở rộng, border sáng hơn.
 * Giống Shopify Editions card style.
 */
export function GlowCard({ children, className, speed = 4, glowIntensity = 0.4 }: Props) {
  const reduce = useReducedMotion();

  return (
    <div className={cn("group/glow relative rounded-3xl p-[1px]", className)}>
      {/* Animated conic-gradient border */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover/glow:opacity-100",
          reduce && "hidden"
        )}
        style={{
          background: `conic-gradient(from var(--glow-angle, 0deg), var(--vhd-color-primary), var(--vhd-color-accent), var(--vhd-color-highlight), var(--vhd-color-danger), var(--vhd-color-primary))`,
          animation: reduce ? "none" : `glow-rotate ${speed}s linear infinite`,
        }}
        aria-hidden
      />
      {/* Outer glow blur */}
      <div
        className={cn(
          "absolute -inset-1 rounded-3xl blur-xl opacity-0 transition-opacity duration-500 group-hover/glow:opacity-[var(--glow-intensity)]",
          reduce && "hidden"
        )}
        style={
          {
            "--glow-intensity": glowIntensity,
            background: `conic-gradient(from var(--glow-angle, 0deg), var(--vhd-color-primary), var(--vhd-color-accent), var(--vhd-color-highlight), var(--vhd-color-danger), var(--vhd-color-primary))`,
            animation: reduce ? "none" : `glow-rotate ${speed}s linear infinite`,
          } as React.CSSProperties
        }
        aria-hidden
      />
      {/* Inner content */}
      <div className="relative rounded-3xl bg-card">{children}</div>
    </div>
  );
}
