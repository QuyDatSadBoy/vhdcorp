"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Hero domain art — illustration on-brand cho VHD Corp:
 * - SVG composition: ống nhựa PVC + tấm cao su xếp chồng + bó miến với dây đỏ.
 * - Floating layers, parallax tinh tế, gợi đúng 3 lĩnh vực kinh doanh.
 * Thay thế cho 3D scene generic — phù hợp domain hơn và load nhẹ.
 */
export function HeroDomainArt({ className }: { className?: string }) {
  return (
    <div className={"relative " + (className ?? "")} aria-hidden>
      {/* Backdrop logo aura — vòng cung yellow/red giống logo VHD */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/images/illustrations/hero-collage.svg"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 0px, 720px"
          className="object-contain"
        />
      </motion.div>

      {/* Floating brand chips — gợi 3 lĩnh vực */}
      <motion.div
        className="pointer-events-none absolute left-[8%] top-[18%] hidden rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-primary shadow-md backdrop-blur md:inline-flex"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, -8, 0] }}
        transition={{ delay: 0.6, duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary" />
        Ống nhựa PVC
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-[8%] top-[12%] hidden rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-primary shadow-md backdrop-blur md:inline-flex"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{ delay: 0.9, duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-brand-accent" />
        Tấm cao su kỹ thuật
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-[12%] left-[20%] hidden rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-primary shadow-md backdrop-blur md:inline-flex"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{ delay: 1.2, duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-brand-highlight" />
        Miến làng nghề
      </motion.div>
    </div>
  );
}
