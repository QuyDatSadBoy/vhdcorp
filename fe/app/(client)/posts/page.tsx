"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePosts } from "@/services/post.service";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageFallback } from "@/components/client/image-fallback";
import { PageHero } from "@/components/client/page-hero";

export default function PostsPage() {
  const { data, isLoading } = usePosts({ pageSize: 24 });
  const posts = data?.records ?? [];

  return (
    <>
      <PageHero
        eyebrow="Câu chuyện VHD"
        title="Tin tức & Bài viết"
        description="Cập nhật về sản phẩm mới, hoạt động hợp tác, kiến thức ngành nhựa - cao su và đặc sản làng nghề Việt Nam."
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tin tức" }]}
      />
      <div className="container mx-auto px-4 py-12">

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-4/3" />)}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              suppressHydrationWarning
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <Link href={`/posts/${post.slug}`} className="group block">
                <div className="relative aspect-16/10 overflow-hidden rounded-xl bg-muted">
                  {post.coverImage ? (
                    <Image src={post.coverImage} alt={post.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <ImageFallback label="Tin tức" />
                  )}
                </div>
                <h2 className="mt-4 line-clamp-2 text-xl font-bold transition-colors group-hover:text-brand-primary">{post.title}</h2>
                {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
                <div className="mt-3 text-xs text-muted-foreground">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("vi-VN") : ""}
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
