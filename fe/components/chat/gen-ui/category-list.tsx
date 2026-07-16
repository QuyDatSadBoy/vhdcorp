"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FolderTree } from "lucide-react";

export interface ChatCategory {
  slug: string;
  name: string;
  product_count: number;
  url: string;
}

/** Chip danh mục gen-UI — khách bấm là mở trang sản phẩm đã lọc theo danh mục. */
export default function CategoryList({ categories }: { categories: ChatCategory[] }) {
  if (!categories?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-wrap gap-2"
    >
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={c.url as never}
          target="_blank"
          className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand-primary/40 hover:bg-brand-primary hover:text-white"
        >
          <FolderTree className="h-3.5 w-3.5 text-brand-primary group-hover:text-white" />
          {c.name}
          <span className="rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-primary group-hover:bg-white/20 group-hover:text-white">
            {c.product_count}
          </span>
        </Link>
      ))}
    </motion.div>
  );
}
