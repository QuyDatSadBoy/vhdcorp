"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: string;
  className?: string;
  /** Delay trước khi bắt đầu reveal */
  delay?: number;
  /** Thời gian mỗi ký tự */
  charDuration?: number;
  /** Stagger giữa các ký tự */
  stagger?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

/**
 * Scroll-triggered char-by-char text reveal — giống Shopify Editions.
 * Mỗi chữ cái fade-in + slide-up với stagger cực mịn.
 */
export function TextReveal({
  children,
  className,
  delay = 0,
  charDuration = 0.4,
  stagger = 0.015,
  as: Tag = "h2",
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  // Tách text thành words rồi chars, giữ nguyên khoảng trắng giữa words
  const words = children.split(" ");

  return (
    // overflow-hidden KHÔNG đặt ở Tag gốc — đặt ở từng word-wrapper
    // để clip chỉ trong boundary của từng word, tránh clip toàn bộ heading
    <Tag className={cn(className)}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block">
          {/* overflow-hidden mask tại mức word */}
          <span className="inline-block overflow-hidden">
            <span className="inline-block">
              {word.split("").map((char, ci) => {
                const globalIdx = words.slice(0, wi).reduce((acc, w) => acc + w.length, 0) + ci;
                return (
                  <motion.span
                    key={`${wi}-${ci}`}
                    initial={{ opacity: 0, y: "110%", filter: "blur(3px)" }}
                    whileInView={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: charDuration,
                      delay: delay + globalIdx * stagger,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                );
              })}
            </span>
          </span>
          {/* Khoảng trắng giữa words nằm ngoài overflow-hidden */}
          {wi < words.length - 1 && "\u00a0"}
        </span>
      ))}
    </Tag>
  );
}
