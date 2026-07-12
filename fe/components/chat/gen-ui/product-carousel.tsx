"use client";

import { motion, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { ChatProduct } from "@/types/chat";
import ProductCard from "./product-card";

/** Stagger cho card xuất hiện lần lượt khi block render */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Carousel sản phẩm cuộn ngang (§9.2). Mobile vuốt ngang mượt;
 * desktop có nút mũi tên cuộn. Tái dùng ProductCard.
 */
export default function ProductCarousel({ products }: { products: ChatProduct[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products?.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Nút cuộn — chỉ desktop, ẩn khi ít card */}
      {products.length > 2 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Cuộn trái"
            className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 p-1.5 shadow-md backdrop-blur transition-colors hover:bg-muted sm:grid"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Cuộn phải"
            className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 p-1.5 shadow-md backdrop-blur transition-colors hover:bg-muted sm:grid"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      )}

      <motion.div
        ref={scrollRef}
        variants={container}
        initial="hidden"
        animate="show"
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {products.map((p, i) => (
          <motion.div key={`${p.slug}-${i}`} variants={item} className="snap-start">
            <ProductCard product={p} compact />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
