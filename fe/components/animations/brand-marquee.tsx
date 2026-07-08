"use client";

import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text?: string;
  duration?: number;
  variant?: "primary" | "highlight" | "outline";
  className?: string;
}

const DEFAULT_PHRASES = [
  "KẾT NỐI GIÁ TRỊ",
  "HỢP TÁC VỮNG BỀN",
  "VHD CORP",
  "B2B / B2C",
  "TỔNG KHO NHỰA · CAO SU · MIẾN",
];

/** Dải băng chạy ngang lặp lại text branding — giống Shopify rolling tape */
export function BrandMarquee({ text, duration = 38, variant = "primary", className }: Props) {
  const phrases = text ? [text] : DEFAULT_PHRASES;
  const items = Array.from({ length: 8 }).flatMap((_, i) => phrases.map((p, j) => ({ key: `${i}-${j}`, text: p })));

  const styleMap = {
    primary: "bg-brand-primary text-white",
    highlight: "bg-(--vhd-color-highlight) text-(--vhd-color-primary)",
    outline: "border-y border-foreground/10 bg-background text-foreground",
  };

  return (
    <div className={cn("relative overflow-hidden py-4 md:py-5", styleMap[variant], className)}>
      <motion.div
        className="flex w-max items-center gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {[...items, ...items].map((it, i) => (
          <span key={`${it.key}-${i}`} className="flex items-center gap-8">
            <span className="font-heading text-lg font-bold uppercase tracking-[0.2em] md:text-xl">{it.text}</span>
            <Sparkle
              className={cn(
                "h-3.5 w-3.5",
                variant === "primary" && "text-(--vhd-color-highlight)",
                variant === "highlight" && "text-(--vhd-color-primary)",
                variant === "outline" && "text-(--vhd-color-accent)"
              )}
              fill="currentColor"
            />
          </span>
        ))}
      </motion.div>
    </div>
  );
}
