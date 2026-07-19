"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { postKeys, postService, type PostListParams } from "@/services/post.service";
import type { PaginatedResult, Post } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageFallback } from "@/components/client/image-fallback";
import { PageHero } from "@/components/client/page-hero";
import { useSiteConfigStore } from "@/store/site-config.store";

interface PostsPageClientProps {
  /** Trang 1 đã fetch server-side (SSR) — giúp link bài viết có mặt trong HTML đầu cho crawler. */
  initialData?: PaginatedResult<Post>;
}

const LIST_PARAMS: PostListParams = { pageSize: 24 };

export default function PostsPageClient({ initialData }: PostsPageClientProps) {
  const { data, isLoading } = useQuery({
    queryKey: postKeys.list(LIST_PARAMS),
    queryFn: () => postService.list(LIST_PARAMS),
    staleTime: 60_000,
    initialData,
  });
  const posts = data?.records ?? [];
  // Chữ hero admin sửa trong Builder (khối cố định trang Tin tức)
  const fb = useSiteConfigStore((st) => st.config?.fixedBlocks?.posts);

  return (
    <>
      <PageHero
        eyebrow={fb?.eyebrow || "Câu chuyện VHD"}
        title={fb?.title || "Tin tức & Bài viết"}
        description={
          fb?.description ||
          "Cập nhật về sản phẩm mới, hoạt động hợp tác, kiến thức ngành điện lạnh, cơ điện và khuôn mẫu, đúc nhựa."
        }
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Tin tức" }]}
        bgImage={fb?.heroImage}
      />
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-4/3" />
            ))}
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
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ImageFallback label="Tin tức" />
                    )}
                    {/* Tag Nổi bật — admin bật trong form bài viết */}
                    {post.isFeatured && (
                      <span className="absolute left-3 top-3 rounded-full bg-brand-highlight px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary shadow">
                        Nổi bật
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 line-clamp-2 text-xl font-bold transition-colors group-hover:text-brand-primary">
                    {post.title}
                  </h2>
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
