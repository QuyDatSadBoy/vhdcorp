"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useProducts } from "@/services/product.service";
import { useCategories } from "@/services/category.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageFallback } from "@/components/client/image-fallback";
import { PageHero } from "@/components/client/page-hero";

function ProductsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const categorySlug = params.get("category") ?? undefined;
  const sort = (params.get("sort") as "newest" | "price_asc" | "price_desc" | "name") ?? "newest";

  const { data, isLoading } = useProducts({
    search: params.get("search") ?? undefined,
    categorySlug,
    sort,
    pageSize: 24,
  });
  const { data: categories } = useCategories();

  const setQuery = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/products?${next.toString()}`);
  };

  const products = data?.records ?? [];

  return (
    <>
      <PageHero
        eyebrow="Bộ sưu tập sản phẩm"
        title="Sản phẩm VHD Corp"
        description="Tổng kho ống nhựa PVC, tấm cao su kỹ thuật và đặc sản miến làng nghề Việt Nam — chất lượng đồng nhất, giao hàng toàn quốc cho khách hàng B2B/B2C."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Sản phẩm" }]}
      />
      <div className="container mx-auto px-4 py-12">

      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_240px_200px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery("search", search || undefined);
          }}
        >
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm sản phẩm..." />
        </form>

        <Select value={categorySlug ?? "all"} onValueChange={(v) => setQuery("category", v === "all" ? undefined : v)}>
          <SelectTrigger><SelectValue placeholder="Tất cả danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setQuery("sort", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="price_asc">Giá tăng dần</SelectItem>
            <SelectItem value="price_desc">Giá giảm dần</SelectItem>
            <SelectItem value="name">Tên A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          Không tìm thấy sản phẩm phù hợp.
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.replace("/products")}>Xóa bộ lọc</Button>
          </div>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {products.map((p) => (
            <motion.div key={p.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
              <Link href={`/products/${p.slug}`}>
                <Card className="group h-full overflow-hidden border-transparent transition-all hover:-translate-y-1 hover:border-brand-primary/40 hover:shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {p.images?.[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <ImageFallback />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    {Number(p.price) > 0 && (
                      <p className="mt-2 font-bold text-brand-primary">{Number(p.price).toLocaleString("vi-VN")} ₫</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>
    </>
  );
}

import { Suspense } from "react";
export default function ProductsPage() {
  return <Suspense><ProductsContent /></Suspense>;
}
