"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { usePosts } from "@/services/post.service";
import type { BlogPreviewSection as Section } from "@/types/site-config";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageFallback } from "@/components/client/image-fallback";

function PostCover({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width:768px) 100vw, 50vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  }
  return <ImageFallback variant="post" label="Tin tức" />;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function BlogPreview({ section }: { section: Section }) {
  const p = section.props;
  const limit = p.limit ?? 4;
  const { data, isLoading } = usePosts({ pageSize: limit, tag: p.tagFilter, featured: p.mode === "featured" });
  const posts = data?.records ?? [];
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.style.paddingTop = `${p.paddingTop ?? 96}px`;
    el.style.paddingBottom = `${p.paddingBottom ?? 96}px`;
  }, [p.paddingTop, p.paddingBottom]);

  const [hero, ...rest] = posts;
  const sideTwo = rest.slice(0, 3);

  return (
    <section ref={sectionRef} className="relative bg-(--vhd-color-surface)/60 dark:bg-white/[0.04]">
      <div className="container mx-auto px-4">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="type-eyebrow text-brand-primary">Tin tức &amp; Cập nhật</p>
            <h2 className="mt-3 type-display-md text-foreground">{p.heading ?? "Câu chuyện VHD"}</h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
          </div>
          <Link
            href="/posts"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline underline-offset-4"
          >
            Xem tất cả bài viết
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="aspect-16/10 rounded-2xl lg:row-span-3" />
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="aspect-video rounded-2xl" />
          </div>
        ) : posts.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-foreground/60">Chưa có bài viết nào.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hero post */}
            {hero && (
              <motion.article
                suppressHydrationWarning
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="lg:row-span-3"
              >
                <Link
                  href={`/posts/${hero.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-foreground/8 bg-card transition-all hover:border-brand-primary/30 hover:shadow-xl"
                >
                  <div className="relative aspect-16/10 overflow-hidden bg-muted">
                    <PostCover src={hero.coverImage} alt={hero.title} />
                    {/* Tag thật theo cờ admin bật (không còn gắn theo vị trí) */}
                    {hero.isFeatured && (
                      <span className="absolute left-4 top-4 rounded-full bg-brand-highlight px-3 py-1 text-xs font-bold text-brand-primary shadow">
                        Nổi bật
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-7">
                    <div className="flex items-center gap-2 text-xs text-foreground/55">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmtDate(hero.publishedAt)}
                    </div>
                    <h3 className="font-heading text-2xl font-bold leading-tight text-foreground transition-colors group-hover:text-brand-primary md:text-3xl">
                      {hero.title}
                    </h3>
                    {hero.excerpt && <p className="line-clamp-3 text-foreground/65">{hero.excerpt}</p>}
                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
                      Đọc bài viết
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            )}

            {/* Side stack */}
            {sideTwo.map((post, i) => (
              <motion.article
                key={post.id}
                suppressHydrationWarning
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/posts/${post.slug}`}
                  className="group grid h-full grid-cols-[140px_1fr] gap-5 overflow-hidden rounded-2xl border border-foreground/8 bg-card p-3 transition-all hover:border-brand-primary/30 hover:shadow-md sm:grid-cols-[180px_1fr]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <PostCover src={post.coverImage} alt={post.title} />
                    {post.isFeatured && (
                      <span className="absolute left-2 top-2 rounded-full bg-brand-highlight px-2 py-0.5 text-[10px] font-bold text-brand-primary shadow">
                        Nổi bật
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-2 pr-4">
                    <div className="flex items-center gap-2 text-xs text-foreground/55">
                      <Calendar className="h-3 w-3" />
                      {fmtDate(post.publishedAt)}
                    </div>
                    <h3 className="line-clamp-2 font-heading text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand-primary md:text-lg">
                      {post.title}
                    </h3>
                    {post.excerpt && <p className="line-clamp-2 text-sm text-foreground/60">{post.excerpt}</p>}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
