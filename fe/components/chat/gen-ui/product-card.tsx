"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatProduct } from "@/types/chat";

/** Format giá VND; null → "Liên hệ" */
export function formatVnd(price: number | null): string {
  if (price === null || price === undefined || price <= 0) return "Liên hệ báo giá";
  return `${price.toLocaleString("vi-VN")} ₫`;
}

/**
 * Placeholder brand khi sản phẩm chưa có ảnh — tái dùng phong cách
 * ImageFallback client (layer icon + "VHD CORP") để đồng nhất toàn site.
 */
function ProductPlaceholder() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid place-items-center bg-linear-to-br from-brand-primary/15 via-brand-accent/10 to-brand-primary/5"
    >
      <div className="fallback-dot-pattern absolute inset-0 opacity-[0.05]" />
      <div className="relative flex flex-col items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/40 ring-1 ring-white/50 dark:bg-white/10 dark:ring-white/15">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-brand-primary/70 dark:stroke-brand-accent/80"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-primary/55 dark:text-brand-accent/70">
          VHD CORP
        </span>
      </div>
    </div>
  );
}

/**
 * Card sản phẩm gọn dùng trong carousel / kết quả tìm ảnh của chat.
 * `compact` = chiều rộng cố định cho carousel cuộn ngang.
 */
export default function ProductCard({ product, compact = false }: { product: ChatProduct; compact?: boolean }) {
  const hasImage = Boolean(product.image);
  const inStock = product.stock > 0;

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:border-brand-accent/60 hover:shadow-[0_16px_40px_-20px_color-mix(in_srgb,var(--vhd-color-primary)_45%,transparent)]",
        compact && "w-40 shrink-0 sm:w-44"
      )}
    >
      {/* Ảnh / placeholder */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {hasImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductPlaceholder />
        )}
        {/* Badge tồn kho */}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
            inStock ? "bg-emerald-500/90 text-white" : "bg-muted-foreground/80 text-background"
          )}
        >
          {inStock ? "Còn hàng" : "Hết hàng"}
        </span>
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {product.category && (
          <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {product.category}
          </p>
        )}
        <h4 className="line-clamp-2 min-h-[2.1rem] text-xs font-semibold leading-snug text-foreground group-hover:text-brand-primary dark:group-hover:text-brand-accent">
          {product.name}
        </h4>
        <p className="mt-auto flex min-h-[2.5rem] flex-wrap content-end items-baseline gap-x-1.5 pt-1 text-sm font-extrabold text-brand-primary dark:text-brand-accent">
          {formatVnd(product.price)}
          {product.originalPrice != null && (
            <span className="text-[11px] font-medium text-foreground/40 line-through">
              {formatVnd(product.originalPrice)}
            </span>
          )}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1.5 inline-flex items-center justify-center gap-1 rounded-lg bg-brand-primary/10 px-2 py-1.5 text-[11px] font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white dark:bg-brand-accent/15 dark:text-brand-accent dark:hover:bg-brand-accent dark:hover:text-background"
        >
          <Package className="h-3 w-3" aria-hidden />
          Xem chi tiết
          <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
