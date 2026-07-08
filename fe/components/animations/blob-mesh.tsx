"use client";

import { motion } from "framer-motion";

interface Props {
  className?: string;
  speed?: number;
}

/** Background blob mesh 4 màu logo — morphing gradient, dark mode compatible */
export function BlobMesh({ className, speed = 14 }: Props) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      <motion.div
        className="absolute -left-20 top-0 h-[60%] w-[55%] rounded-full bg-(--vhd-color-accent)/40 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: speed, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-20 top-1/4 h-[65%] w-[60%] rounded-full bg-(--vhd-color-highlight)/30 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, -70, 50, 0], y: [0, 60, -40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: speed * 1.2, ease: "easeInOut", repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute left-1/3 -bottom-20 h-[55%] w-[55%] rounded-full bg-brand-primary/35 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.92, 1] }}
        transition={{ duration: speed * 1.4, ease: "easeInOut", repeat: Infinity, delay: 2 }}
      />
      <motion.div
        className="absolute right-1/4 bottom-0 h-[40%] w-[40%] rounded-full bg-(--vhd-color-danger)/25 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, -30, 40, 0], y: [0, 30, -20, 0], scale: [1, 0.95, 1.08, 1] }}
        transition={{ duration: speed * 1.6, ease: "easeInOut", repeat: Infinity, delay: 3 }}
      />
    </div>
  );
}
