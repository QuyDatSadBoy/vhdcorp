"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Props {
  className?: string;
}

/** SVG handshake vẽ dần khi scroll — biểu tượng đặc trưng logo VHD Corp */
export function HandshakeDraw({ className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end center"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.9, 1], [0, 1, 1, 0.6]);

  return (
    <div ref={ref} className={className}>
      <motion.svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        style={{ opacity }}
        aria-hidden
      >
        {/* Vòng cung ngoài (vàng) */}
        <motion.path
          d="M 160 30 A 130 130 0 1 1 159 30"
          stroke="#F5A623"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
          transition={{ duration: 0 }}
        />
        {/* Cung dưới (đỏ) */}
        <motion.path
          d="M 50 200 Q 160 320 270 200"
          stroke="#C8102E"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Mái nhà */}
        <motion.path
          d="M 110 130 L 160 90 L 210 130"
          stroke="#1B3A8C"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Tay trái */}
        <motion.path
          d="M 105 145 L 150 175 L 130 200 L 95 175 Z"
          stroke="#1B3A8C"
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Tay phải */}
        <motion.path
          d="M 215 145 L 170 175 L 190 200 L 225 175 Z"
          stroke="#4FB8E7"
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          style={{ pathLength }}
        />
        {/* Nối tay */}
        <motion.path
          d="M 145 178 L 175 178"
          stroke="#1B3A8C"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          style={{ pathLength }}
        />
      </motion.svg>
    </div>
  );
}
