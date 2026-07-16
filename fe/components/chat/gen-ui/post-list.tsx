"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Newspaper, ArrowUpRight } from "lucide-react";

export interface ChatPost {
  slug: string;
  title: string;
  excerpt?: string;
  cover?: string;
  url: string;
  tags?: string[];
}

/** Thẻ bài viết gen-UI — agent gợi ý tin tức, khách bấm mở bài ngay. */
export default function PostList({ posts }: { posts: ChatPost[] }) {
  if (!posts?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-2"
    >
      {posts.map((p) => (
        <Link
          key={p.slug}
          href={p.url as never}
          target="_blank"
          className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-brand-primary/40 hover:bg-accent/40"
        >
          {p.cover ? (
            <Image src={p.cover} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <Newspaper className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-brand-primary">
              {p.title}
            </span>
            {p.excerpt && <span className="line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</span>}
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-primary" />
        </Link>
      ))}
    </motion.div>
  );
}
