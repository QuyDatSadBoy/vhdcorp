"use client";

import { motion } from "framer-motion";
import { ScanSearch } from "lucide-react";
import type { ChatProduct } from "@/types/chat";
import ProductCarousel from "./product-carousel";

interface ImageSearchResultProps {
  query: string;
  products: ChatProduct[];
}

/**
 * Kết quả tìm sản phẩm bằng ảnh (§9.4): banner mô tả ảnh + carousel SP.
 */
export default function ImageSearchResult({ query, products }: ImageSearchResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-3"
    >
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-accent/30 bg-linear-to-r from-brand-primary/8 to-brand-accent/10 px-3.5 py-2.5 dark:border-brand-accent/25 dark:from-brand-primary/15 dark:to-brand-accent/12">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand-primary to-brand-accent text-white shadow-sm">
          <ScanSearch className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-brand-primary dark:text-brand-accent">Kết quả từ ảnh của bạn</p>
          {query && <p className="text-xs text-foreground/70">{query}</p>}
        </div>
      </div>
      {products?.length > 0 && <ProductCarousel products={products} />}
    </motion.div>
  );
}
