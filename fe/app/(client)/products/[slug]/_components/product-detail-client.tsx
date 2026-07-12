"use client";

import { useState } from "react";
import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { useProductBySlug, useRelatedProducts } from "@/services/product.service";
import { useProductReviews, useCreateReview } from "@/services/review.service";
import { useAuthStore } from "@/store/auth.store";
import { useSiteConfigStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ImageFallback } from "@/components/client/image-fallback";

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: reviews } = useProductReviews(slug);
  const { data: related } = useRelatedProducts(product?.id);
  const user = useAuthStore((s) => s.user);
  const siteConfig = useSiteConfigStore((s) => s.config);
  const hotline = siteConfig?.footer.contact?.hotline || siteConfig?.footer.contact?.phone || "";
  const createReview = useCreateReview();

  const [imgIdx, setImgIdx] = useState(0);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  if (isLoading) {
    return (
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy sản phẩm</h1>
        <Button asChild className="mt-4">
          <Link href="/products">Về danh sách sản phẩm</Link>
        </Button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];

  async function submitReview() {
    if (!product) return;
    if (!user) {
      toast.error("Vui lòng đăng nhập để đánh giá");
      return;
    }
    if (content.trim().length < 5) {
      toast.error("Nội dung tối thiểu 5 ký tự");
      return;
    }
    try {
      await createReview.mutateAsync({ productId: product.id, rating, content });
      toast.success("Cảm ơn bạn! Đánh giá đang chờ duyệt.");
      setContent("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gửi đánh giá thất bại");
    }
  }

  // JSON-LD Product (kèm aggregateRating) + BreadcrumbList được SSR duy nhất ở page.tsx — không render lại tại client.

  return (
    <article className="container mx-auto px-4 py-12">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href="/products" className="hover:underline">
          Sản phẩm
        </Link>
        {product.category && (
          <>
            {" "}
            /{" "}
            <Link href={`/categories/${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
          </>
        )}
        <>
          {" "}
          / <span className="text-foreground">{product.name}</span>
        </>
      </nav>

      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            {images.length === 0 && <ImageFallback label={product.name} />}
            <AnimatePresence mode="wait">
              {images[imgIdx] && (
                <motion.div
                  key={imgIdx}
                  suppressHydrationWarning
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[imgIdx]}
                    alt={product.name}
                    fill
                    sizes="(max-width:768px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Xem ảnh sản phẩm ${i + 1}`}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${i === imgIdx ? "border-brand-primary" : "border-transparent"}`}
                >
                  <Image src={src} alt="" fill sizes="100px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category?.name && <p className="type-eyebrow text-brand-primary">{product.category.name}</p>}
          <motion.h1
            suppressHydrationWarning
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-foreground md:text-4xl"
          >
            {product.name}
          </motion.h1>
          {product.shortDescription && <p className="mt-3 text-lg text-foreground/70">{product.shortDescription}</p>}

          <div className="mt-6 flex items-end gap-4">
            {Number(product.price) > 0 ? (
              <p className="font-heading text-4xl font-extrabold text-brand-primary">
                {Number(product.price).toLocaleString("vi-VN")}{" "}
                <span className="text-lg font-bold text-foreground/55">₫</span>
              </p>
            ) : (
              <p className="font-heading text-2xl font-extrabold text-foreground/65">Liên hệ báo giá</p>
            )}
            {product.stock !== undefined && product.stock !== null && (
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " +
                  (Number(product.stock) > 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/15 text-red-600")
                }
              >
                {Number(product.stock) > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}
              </span>
            )}
          </div>

          {product.description && (
            <div className="prose mt-7 max-w-none border-t border-foreground/8 pt-7 dark:prose-invert prose-headings:font-heading prose-strong:text-foreground">
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-brand-primary px-7 text-base font-semibold text-white shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--vhd-color-primary)_60%,transparent)] hover:bg-brand-primary/90"
            >
              <Link href="/contact">Liên hệ tư vấn</Link>
            </Button>
            {hotline && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-brand-primary/25 bg-transparent px-7 text-base font-semibold text-brand-primary hover:bg-brand-primary/8"
              >
                <a href={`tel:${hotline.replace(/[\s.]/g, "")}`}>Gọi báo giá</a>
              </Button>
            )}
          </div>

          {/* Trust bullets */}
          <ul className="mt-7 grid gap-2 rounded-2xl border border-foreground/8 bg-card p-5 text-sm text-foreground/70 sm:grid-cols-2">
            <li className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" />
              Chính hãng, kiểm định chất lượng
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" />
              Giao hàng B2B/B2C toàn quốc
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" />
              Hỗ trợ tư vấn 7 ngày/tuần
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" />
              Đổi trả linh hoạt theo hợp đồng
            </li>
          </ul>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">Đánh giá khách hàng</h2>
        <div className="mt-6 space-y-4">
          {(reviews ?? []).length === 0 && <p className="text-muted-foreground">Chưa có đánh giá.</p>}
          {(reviews ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.user?.name ?? "Khách hàng"}</span>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : ""}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm">{r.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-card p-6">
          <h3 className="text-lg font-bold">Viết đánh giá của bạn</h3>
          <div className="mt-4 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} sao`}>
                <Star className={`h-6 w-6 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            className="mt-4"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn..."
          />
          <Button onClick={submitReview} disabled={createReview.isPending} className="mt-4">
            {createReview.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Gửi đánh giá
          </Button>
        </div>
      </section>

      {/* Related */}
      {(related ?? []).length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Sản phẩm liên quan</h2>
          <div
            className={
              "mt-6 grid gap-4 " +
              ((related ?? []).length === 1
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : (related ?? []).length === 2
                  ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-4"
                  : "grid-cols-2 md:grid-cols-4")
            }
          >
            {(related ?? []).map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`}>
                <Card className="group overflow-hidden h-full">
                  <div className="relative aspect-square bg-muted">
                    {p.images?.[0] ? (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        sizes="25vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <ImageFallback />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
