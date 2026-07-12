"use client";

import { memo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ProductCardInline from "./product-card-inline";

/**
 * Render markdown cho câu trả lời của assistant (đậm/nghiêng/list/link/bảng).
 * - Link /products/... → card sản phẩm inline (next/link).
 * - Link nội bộ khác → next/link; link ngoài → mở tab mới.
 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-hr:my-3 prose-strong:text-inherit prose-p:leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const url = href ?? "#";
            // Link sản phẩm nội bộ → card đẹp
            if (url.startsWith("/products/")) {
              return <ProductCardInline href={url}>{children}</ProductCardInline>;
            }
            // Link nội bộ khác → next/link (client navigation)
            if (url.startsWith("/")) {
              return (
                <Link
                  href={url}
                  className="font-medium text-brand-primary underline underline-offset-2 dark:text-brand-accent"
                >
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-primary underline underline-offset-2 dark:text-brand-accent"
              >
                {children}
              </a>
            );
          },
          // Bảng cuộn ngang trong bubble, không phá layout
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border">
              <table className="my-0 w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/60 px-2.5 py-1.5 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border-b border-border/60 px-2.5 py-1.5 align-top">{children}</td>,
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-normal before:content-none after:content-none">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// memo: tránh re-render các bubble cũ khi bubble cuối đang stream
export default memo(MarkdownContent);
