"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { type ReactNode } from "react";
import type { AnimationType } from "@/types/site-config";

/**
 * Animated wrapper — fade/slide khi xuất hiện trong viewport.
 * Tôn trọng prefers-reduced-motion (Framer Motion tự handle).
 */
const variants: Record<AnimationType, Variants> = {
  none: { hidden: {}, visible: {} },
  "fade-up": {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  "zoom-in": {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
};

interface RevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  type?: AnimationType;
  delay?: number;
  once?: boolean;
  amount?: number;
  children?: ReactNode;
}

export function Reveal({
  type = "fade-up",
  delay = 0,
  once = true,
  amount = 0.2,
  children,
  ...rest
}: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants[type]}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  delay?: number;
  staggerChildren?: number;
  children?: ReactNode;
}

export function Stagger({
  delay = 0,
  staggerChildren = 0.08,
  children,
  ...rest
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const StaggerItem = motion.div;
export const fadeUpItem: Variants = variants["fade-up"];
