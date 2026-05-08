"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCategoryBySlug } from "@/services/category.service";
import { useProducts } from "@/services/product.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ImageFallback } from "@/components/client/image-fallback";
import { PageHero } from "@/components/client/page-hero";

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: category, isLoading: catLoading } = useCategoryBySlug(slug);
  const { data: products, isLoading: prodLoading } = useProducts({ categorySlug: slug, pageSize: 24 });

  if (catLoading) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-12">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold">Không tìm thấy danh mục</h1>
        <p className="mt-2 text-foreground/55">Danh mục bạn yêu cầu không tồn tại hoặc đã bị xoá.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-primary px-6 text-sm font-semibold text-white"
        >
          ← Quay về Sản phẩm
        </Link>
      </div>
    );
  }

  const list = products?.records ?? [];

  return (
    <>
      <PageHero
        eyebrow="Danh mục sản phẩm"
        title={category.name}
        description={category.description ?? `Khám phá toàn bộ sản phẩm thuộc danh mục ${category.name} của VHD Corp.`}
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/products" },
          { label: category.name },
        ]}
      />
      <div className="container mx-auto px-4 py-12">
        {prodLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-12 text-center text-foreground/60">
            Hiện chưa có sản phẩm trong danh mục này. Vui lòng quay lại sau.
          </p>
        ) : (
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
        )}
      </div>
    </>
  );
}
