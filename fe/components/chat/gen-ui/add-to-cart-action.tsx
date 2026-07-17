"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/price";
import { useCartStore } from "@/store/cart.store";
import type { ChatProduct } from "@/types/chat";

const PROCESSED_KEY = "vhd_chat_cart_actions";

/** Đánh dấu action đã xử lý — reload trang không thêm giỏ lần 2. */
function markProcessed(actionId: string): boolean {
  try {
    const done: string[] = JSON.parse(localStorage.getItem(PROCESSED_KEY) ?? "[]");
    if (done.includes(actionId)) return false;
    localStorage.setItem(PROCESSED_KEY, JSON.stringify([...done.slice(-49), actionId]));
    return true;
  } catch {
    return true;
  }
}

/**
 * Agent THÊM GIỎ HỘ KHÁCH (agentic action): tool add_to_cart đẩy component này,
 * mount lần đầu là thêm vào giỏ thật (idempotent theo action_id), render thẻ xác nhận.
 */
export default function AddToCartAction({
  product,
  qty,
  actionId,
}: {
  product: ChatProduct & { id?: number };
  qty: number;
  actionId: string;
}) {
  const add = useCartStore((s) => s.add);
  const [added, setAdded] = useState(false);
  // Sản phẩm "Liên hệ báo giá" (giá = 0) — không thêm giỏ, dẫn tới form liên hệ
  const quoteOnly = Number(product?.originalPrice ?? product?.price ?? 0) <= 0;

  useEffect(() => {
    if (!product?.id || !actionId) return;
    if (!quoteOnly && markProcessed(actionId)) {
      add(
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image ?? "",
          price: Number(product.originalPrice ?? product.price ?? 0),
          salePrice: product.originalPrice != null ? Number(product.price) : null,
          stock: product.stock ?? 0,
        },
        qty
      );
    }
    setAdded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chạy đúng 1 lần theo actionId
  }, [actionId]);

  if (!added) return null;

  if (quoteOnly) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-xl border border-(--vhd-color-highlight)/40 bg-(--vhd-color-highlight)/8 p-3"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-(--vhd-color-highlight)/15">
          <Package className="h-5 w-5 text-brand-highlight" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm font-semibold">Sản phẩm báo giá theo yêu cầu</span>
          <span className="line-clamp-1 block text-xs text-muted-foreground">
            {product.name} — để lại liên hệ, VHD sẽ báo giá riêng cho bạn
          </span>
        </span>
        <Button asChild size="sm" className="shrink-0 rounded-full">
          <Link href={`/contact?topic=quote&product=${encodeURIComponent(product.slug)}`}>Liên hệ báo giá</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
    >
      {product.image ? (
        <Image
          src={product.image}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-primary/10">
          <Package className="h-5 w-5 text-brand-primary" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Đã thêm vào giỏ
        </span>
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {product.name} ×{qty} — {formatVnd(Number(product.price ?? 0) * qty)}
        </span>
      </span>
      <Button asChild size="sm" className="shrink-0 gap-1.5 rounded-full">
        <Link href="/cart">
          <ShoppingCart className="h-3.5 w-3.5" /> Xem giỏ hàng
        </Link>
      </Button>
    </motion.div>
  );
}
