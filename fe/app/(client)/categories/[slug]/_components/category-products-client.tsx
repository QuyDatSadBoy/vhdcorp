"use client";

import Link from "next/link";
import Image from "next/image";
import { useProducts } from "@/services/product.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ImageFallback } from "@/components/client/image-fallback";
import type { Product } from "@/types/domain";

interface Props {
  slug: string;
  initialProducts: Product[];
}

/**
 * Hiển thị grid sản phẩm — client component để hỗ trợ filter/pagination về sau.
 * Dữ liệu initial đến từ SSR, hydration tiếp tục lấy bản fresh qua TanStack Query.
 */
export function CategoryProductsClient({ slug, initialProducts }: Props) {
  const { data, isLoading } = useProducts({ categorySlug: slug, pageSize: 24 });
  const list = data?.records ?? initialProducts;

  if (isLoading && list.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed bg-card p-12 text-center text-foreground/60">
        Hiện chưa có sản phẩm trong danh mục này. Vui lòng quay lại sau.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {list.map((p) => (
        <Link key={p.id} href={`/products/${p.slug}`}>
          <Card className="group h-full overflow-hidden border-foreground/8 transition-all hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-md">
            <div className="relative aspect-square bg-muted">
              {p.images?.[0] ? (
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <ImageFallback />
              )}
            </div>
            <CardContent className="p-4 space-y-1.5">
              <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-brand-primary">
                {p.name}
              </h3>
              {Number(p.price) > 0 && (
                <p className="font-bold text-brand-primary">{Number(p.price).toLocaleString("vi-VN")} ₫</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
