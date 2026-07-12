"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";

/**
 * Card sản phẩm inline trong câu trả lời của agent — render cho các link
 * markdown trỏ tới /products/... (agent "tương tác với UI").
 */
export default function ProductCardInline({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="not-prose my-0.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-primary/25 bg-brand-primary/5 px-2.5 py-1.5 text-xs font-semibold text-brand-primary no-underline transition-colors hover:border-brand-accent hover:bg-brand-accent/10 dark:border-border dark:bg-muted/70 dark:text-foreground dark:hover:border-brand-accent"
    >
      <Package className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
      <span className="truncate">{children}</span>
      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}
