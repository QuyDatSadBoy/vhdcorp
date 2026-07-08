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
 * Scroll-triggered char-by-char text reveal.
 * Dùng opacity + y (không dùng overflow-hidden clip) để tránh lỗi height collapse
 * khi inline-block span có transform y làm container co về 0.
 */
export function TextReveal({
  children,
  className,
  delay = 0,
  charDuration = 0.4,
  stagger = 0.018,
  as: Tag = "h2",
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <Tag className={className}>{children}</Tag>;
  }

  const words = children.split(" ");
  let globalIdx = 0;

  return (
    <Tag className={cn(className)}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split("").map((char) => {
            const idx = globalIdx++;
            return (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: charDuration,
                  delay: delay + idx * stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
