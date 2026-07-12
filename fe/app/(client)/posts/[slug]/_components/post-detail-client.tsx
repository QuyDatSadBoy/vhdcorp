"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, Clock, User2, Tag, ArrowLeft, ArrowRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { usePostBySlug, usePosts } from "@/services/post.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ImageFallback } from "@/components/client/image-fallback";

function readingTime(html?: string) {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: post, isLoading } = usePostBySlug(slug);
  const { data: relatedData } = usePosts({ pageSize: 6 });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-16">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold">Không tìm thấy bài viết</h1>
        <p className="mt-2 text-foreground/55">Bài viết bạn yêu cầu không tồn tại hoặc đã bị xoá.</p>
        <Button asChild className="mt-6 h-11 rounded-full bg-brand-primary px-6">
          <Link href="/posts">← Về danh sách Tin tức</Link>
        </Button>
      </div>
    );
  }

  const reads = readingTime(post.content);
  const related = (relatedData?.records ?? []).filter((p) => p.id !== post.id).slice(0, 3);

  function shareToClipboard() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Đã sao chép liên kết bài viết"),
      () => toast.error("Không thể sao chép liên kết")
    );
  }

  return (
    <article>
      {/* Article hero — title block on tinted brand surface */}
      <header className="border-b border-foreground/8 bg-(--vhd-color-surface)/60 dark:bg-white/[0.04]">
        <div className="container mx-auto max-w-4xl px-4 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-foreground/55">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <span className="opacity-60">/</span>
            <Link href="/posts" className="hover:text-foreground">
              Tin tức
            </Link>
            <span className="opacity-60">/</span>
            <span className="text-foreground line-clamp-1">{post.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-highlight/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-primary">
              <Tag className="h-3 w-3" />
              Tin tức VHD
            </span>
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/55">
                <Calendar className="h-3 w-3" /> {fmtDate(post.publishedAt)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/55">
              <Clock className="h-3 w-3" /> {reads} phút đọc
            </span>
          </div>

          <motion.h1
            suppressHydrationWarning
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-5xl"
          >
            {post.title}
          </motion.h1>

          {post.excerpt && <p className="mt-5 max-w-3xl text-lg leading-relaxed text-foreground/70">{post.excerpt}</p>}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            {post.author?.name && (
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-primary text-sm font-bold text-white">
                  {post.author.name[0]?.toUpperCase()}
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">{post.author.name}</p>
                  <p className="text-xs text-foreground/55 inline-flex items-center gap-1">
                    <User2 className="h-3 w-3" /> Tác giả VHD Corp
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={shareToClipboard}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-brand-primary/40 hover:text-brand-primary"
              aria-label="Chia sẻ bài viết"
            >
              <Share2 className="h-4 w-4" /> Chia sẻ
            </button>
          </div>
        </div>
      </header>

      {/* Cover */}
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative -mt-10 aspect-video overflow-hidden rounded-3xl border border-foreground/8 bg-muted shadow-xl"
        >
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          ) : (
            <ImageFallback label="Tin tức" />
          )}
        </motion.div>
      </div>

      {/* Body */}
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div
          className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-a:text-brand-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-img:rounded-2xl"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />

        {post.tags?.length ? (
          <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/55">Chủ đề:</span>
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/posts?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-foreground/12 bg-card px-3 py-1 text-xs font-medium text-foreground/75 transition-colors hover:border-brand-primary/30 hover:text-brand-primary"
              >
                #{t}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Author + share strip */}
        <div className="mt-12 grid gap-4 rounded-3xl bg-(--vhd-color-surface)/60 dark:bg-white/[0.04] p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-primary text-base font-bold text-white">
              {post.author?.name?.[0]?.toUpperCase() ?? "V"}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.author?.name ?? "VHD Admin"}</p>
              <p className="text-xs text-foreground/55">
                Đội ngũ biên tập VHD Corp — viết về sản phẩm, công nghệ và làng nghề Việt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={shareToClipboard}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary/90"
          >
            <Share2 className="h-4 w-4" /> Chia sẻ bài viết
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" /> Tất cả bài viết
            </Link>
          </Button>
          <Button asChild className="rounded-full bg-brand-primary hover:bg-brand-primary/90">
            <Link href="/contact">
              Liên hệ VHD <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-foreground/8 bg-(--vhd-color-surface)/40 dark:bg-white/[0.03] py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8">
              <p className="type-eyebrow text-brand-primary">Có thể bạn quan tâm</p>
              <h2 className="mt-2 type-display-md text-foreground">Bài viết liên quan</h2>
              <div className="mt-4 h-1 w-12 rounded-full bg-brand-highlight" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-foreground/8 bg-card transition-all hover:-translate-y-1 hover:border-brand-primary/30 hover:shadow-lg"
                >
                  <div className="relative aspect-16/10 overflow-hidden bg-muted">
                    {p.coverImage ? (
                      <Image
                        src={p.coverImage}
                        alt={p.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ImageFallback label="Tin tức" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    {p.publishedAt && <p className="text-xs text-foreground/55">{fmtDate(p.publishedAt)}</p>}
                    <h3 className="line-clamp-2 font-heading text-base font-bold text-foreground transition-colors group-hover:text-brand-primary">
                      {p.title}
                    </h3>
                    {p.excerpt && <p className="line-clamp-2 text-sm text-foreground/60">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
