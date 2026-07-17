"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, Phone, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { effectivePrice, isContactPrice, saleActive } from "@/lib/price";
import { useCartStore } from "@/store/cart.store";
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

  // Sản phẩm "Liên hệ báo giá" (giá = 0): không cho vào giỏ — dẫn thẳng tới form liên hệ
  if (isContactPrice(product)) {
    return (
      <Button asChild className={cn("gap-2 rounded-full", withQty ? "h-10 px-6" : "h-9 px-4", className)}>
        <Link href={`/contact?topic=quote&product=${encodeURIComponent(product.slug)}`}>
          <Phone className="h-4 w-4" />
          Liên hệ báo giá
        </Link>
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
