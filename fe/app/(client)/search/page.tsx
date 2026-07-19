"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon, FileText, Package } from "lucide-react";
import { useProducts } from "@/services/product.service";
import { usePosts } from "@/services/post.service";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageFallback } from "@/components/client/image-fallback";
import { PageHero } from "@/components/client/page-hero";

function SearchContent() {
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const [q, setQ] = useState(initialQ);

  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp]);

  const products = useProducts({ search: q || undefined, pageSize: 24 });
  const posts = usePosts({ search: q || undefined, pageSize: 24 });

  return (
    <>
      <PageHero
        eyebrow="Tìm kiếm"
        title={q ? `Kết quả cho "${q}"` : "Tìm sản phẩm và bài viết"}
        description="Gõ từ khóa để tìm sản phẩm, bài viết, danh mục trong toàn bộ kho hàng và tài liệu của VHD Corp."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tìm kiếm" }]}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <Input
            className="h-12 rounded-full pl-11 text-base"
            placeholder="Tìm sản phẩm, bài viết..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Từ khóa tìm kiếm"
          />
        </div>

        <Tabs defaultValue="products" className="mt-10">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-3.5 w-3.5" />
              Sản phẩm ({products.data?.totalItems ?? 0})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Bài viết ({posts.data?.totalItems ?? 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            {(products.data?.records ?? []).length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed p-10 text-center text-foreground/55">
                Không tìm thấy sản phẩm phù hợp.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {(products.data?.records ?? []).map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`}>
                    <Card className="group overflow-hidden border-foreground/8 transition-all hover:border-brand-primary/30 hover:shadow-md">
                      <div className="relative aspect-square bg-muted">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            sizes="25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <ImageFallback />
                        )}
                      </div>
                      <CardContent className="p-3 space-y-1">
                        <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-brand-primary">
                          {p.name}
                        </h3>
                        {Number(p.price) > 0 && (
                          <p className="text-sm font-bold text-brand-primary">
                            {Number(p.price).toLocaleString("vi-VN")} ₫
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="posts">
            {(posts.data?.records ?? []).length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed p-10 text-center text-foreground/55">
                Không tìm thấy bài viết phù hợp.
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {(posts.data?.records ?? []).map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="group grid grid-cols-[100px_1fr] gap-4 rounded-2xl border border-foreground/8 bg-card p-4 transition-all hover:border-brand-primary/30 hover:shadow-md sm:grid-cols-[140px_1fr]"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            sizes="140px"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <ImageFallback label="Tin tức" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center gap-1">
                        <h3 className="font-semibold text-foreground transition-colors group-hover:text-brand-primary">
                          {post.title}
                        </h3>
                        {post.excerpt && <p className="line-clamp-2 text-sm text-foreground/60">{post.excerpt}</p>}
                        {post.publishedAt && (
                          <p className="text-xs text-foreground/45">
                            {new Date(post.publishedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
