"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { History, Package } from "lucide-react";
import { PriceTag } from "@/components/client/price-tag";

export interface RecentProduct {
  slug: string;
  name: string;
  image: string;
  price: number;
  salePrice: number | null;
  saleEndsAt: string | null;
}

const KEY = "vhd_recent_products";
const MAX = 8;

/** Ghi 1 sản phẩm vào lịch sử xem (gọi ở trang chi tiết) — mới nhất lên đầu, tối đa 8. */
export function pushRecentProduct(p: RecentProduct) {
  if (typeof window === "undefined") return;
  try {
    const list: RecentProduct[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const next = [p, ...list.filter((x) => x.slug !== p.slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage đầy/không khả dụng — bỏ qua, không ảnh hưởng trang */
  }
}

/** Dải "Đã xem gần đây" kiểu Shopee — đọc localStorage, ẩn khi chưa xem gì. */
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const list: RecentProduct[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      setItems(list.filter((x) => x.slug !== excludeSlug));
    } catch {
      setItems([]);
    }
  }, [excludeSlug]);

  if (items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <History className="h-5 w-5 text-brand-primary" /> Đã xem gần đây
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/products/${p.slug}`}
            className="group rounded-xl border bg-card p-2.5 transition-all hover:border-brand-primary/40 hover:shadow-md"
          >
            {p.image ? (
              <Image
                src={p.image}
                alt=""
                width={140}
                height={140}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ) : (
              <span className="grid aspect-square w-full place-items-center rounded-lg bg-brand-primary/10">
                <Package className="h-6 w-6 text-brand-primary" />
              </span>
            )}
            <p className="mt-2 line-clamp-1 text-xs font-medium group-hover:text-brand-primary">{p.name}</p>
            <PriceTag product={p} size="sm" className="mt-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
