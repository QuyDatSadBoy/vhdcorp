"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const ratio = docHeight > 0 ? Math.min(1, scrolled / docHeight) : 0;
      setProgress(ratio);
      setShow(scrolled > window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // SVG ring stroke math
  const SIZE = 48;
  const STROKE = 3;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const offset = CIRC * (1 - progress);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          suppressHydrationWarning
          onClick={scrollToTop}
          aria-label="Cuộn lên đầu trang"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25 }}
          // bottom-40/42: xếp trên FloatingContact (bottom-24) + nút chat AI (bottom-6) để không đè nhau
          className="group fixed bottom-40 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-background/95 text-foreground shadow-[0_8px_24px_-10px_rgba(15,35,86,0.4)] backdrop-blur transition-colors hover:text-brand-primary sm:bottom-42 sm:right-6"
        >
          <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-foreground/10"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              className="text-brand-primary transition-[stroke-dashoffset] duration-150"
            />
          </svg>
          <ArrowUp className="relative h-4 w-4 transition-transform group-hover:-translate-y-0.5" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
