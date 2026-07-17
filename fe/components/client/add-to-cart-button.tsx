"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { effectivePrice, isContactPrice, saleActive } from "@/lib/price";
import { useCartStore } from "@/store/cart.store";
import { useQuoteStore } from "@/store/quote.store";
import type { Product } from "@/types/domain";

type CartProduct = Pick<Product, "id" | "slug" | "name" | "images" | "price" | "salePrice" | "saleEndsAt" | "stock">;

/**
 * Nút "Thêm vào giỏ" (kiểu Shopee — không cần đăng nhập).
 * withQty: hiện bộ chọn số lượng (dùng ở trang chi tiết).
 */
export function AddToCartButton({
  product,
  withQty = false,
  className,
}: {
  product: CartProduct;
  withQty?: boolean;
  className?: string;
}) {
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const out = product.stock <= 0;
  const router = useRouter();
  const quoteAdd = useQuoteStore((s) => s.add);
  const inQuote = useQuoteStore((s) => s.items.some((i) => i.productId === product.id));

  // Sản phẩm "Liên hệ báo giá" (giá = 0): gom vào DANH SÁCH BÁO GIÁ — khách chọn
  // nhiều sản phẩm rồi gửi MỘT yêu cầu ở trang Liên hệ (không phải gửi từng cái).
  if (isContactPrice(product)) {
    return (
      <Button
        variant={inQuote ? "outline" : "default"}
        onClick={() => {
          if (!inQuote) {
            quoteAdd({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              image: product.images?.[0] ?? "",
            });
            toast.success(`Đã thêm "${product.name}" vào danh sách báo giá`, {
              action: { label: "Gửi yêu cầu", onClick: () => router.push("/contact?topic=quote") },
            });
          } else {
            router.push("/contact?topic=quote");
          }
        }}
        className={cn("gap-2 rounded-full", withQty ? "h-10 px-6" : "h-9 px-4", className)}
      >
        <ClipboardList className="h-4 w-4" />
        {inQuote ? "Đã chọn — Gửi yêu cầu báo giá" : "Thêm vào DS báo giá"}
      </Button>
    );
  }

  const handleAdd = () => {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0] ?? "",
        price: Number(product.price),
        salePrice: saleActive(product) ? effectivePrice(product) : null,
        stock: product.stock,
      },
      qty
    );
    toast.success(`Đã thêm "${product.name}" vào giỏ hàng`, {
      action: { label: "Xem giỏ", onClick: () => (window.location.href = "/cart") },
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {withQty && (
        <div className="flex items-center rounded-full border">
          <button
            type="button"
            aria-label="Giảm số lượng"
            className="grid h-10 w-10 place-items-center rounded-l-full hover:bg-accent disabled:opacity-40"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-bold">{qty}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            className="grid h-10 w-10 place-items-center rounded-r-full hover:bg-accent disabled:opacity-40"
            disabled={product.stock > 0 && qty >= product.stock}
            onClick={() => setQty((q) => q + 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button
        onClick={handleAdd}
        disabled={out}
        className={cn("gap-2 rounded-full", withQty ? "h-10 px-6" : "h-9 px-4")}
      >
        <ShoppingCart className="h-4 w-4" />
        {out ? "Tạm hết hàng" : "Thêm vào giỏ"}
      </Button>
    </div>
  );
}
