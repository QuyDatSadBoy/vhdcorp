"use client";

import { cn } from "@/lib/utils";
import { effectivePrice, formatVnd, isContactPrice, saleActive, salePercent } from "@/lib/price";
import type { Product } from "@/types/domain";

type PriceInput = Pick<Product, "price" | "salePrice" | "saleEndsAt">;

/**
 * Giá kiểu Shopee: giá KM đỏ + giá gốc gạch + badge "-x%".
 * Không có KM → chỉ hiện giá thường (giữ style cũ qua className).
 */
export function PriceTag({
  product,
  size = "md",
  className,
  showDeadline = false,
}: {
  product: PriceInput;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Hiện "KM đến dd/mm" khi khuyến mãi có hạn (trang chi tiết) */
  showDeadline?: boolean;
}) {
  const onSale = saleActive(product);
  const price = effectivePrice(product);
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-3xl" } as const;
  // Giá = 0: sản phẩm báo giá theo yêu cầu — hiện nhãn thay vì con số
  if (isContactPrice(product)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-(--vhd-color-highlight)/15 px-2.5 py-0.5 font-bold text-brand-highlight",
          size === "lg" ? "text-lg" : "text-xs",
          className
        )}
      >
        Liên hệ báo giá
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-extrabold", sizes[size], onSale ? "text-brand-danger" : "text-brand-primary")}>
        {formatVnd(price)}
      </span>
      {onSale && (
        <>
          <span className={cn("font-medium text-foreground/45 line-through", size === "lg" ? "text-lg" : "text-xs")}>
            {formatVnd(product.price)}
          </span>
          <span className="rounded bg-brand-danger/10 px-1.5 py-0.5 text-[11px] font-bold text-brand-danger">
            -{salePercent(product)}%
          </span>
          {showDeadline && product.saleEndsAt && (
            <span className="text-[11px] font-medium text-brand-danger/80">
              KM đến {new Date(product.saleEndsAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
          )}
        </>
      )}
    </span>
  );
}
