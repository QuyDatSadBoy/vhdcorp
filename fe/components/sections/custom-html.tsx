"use client";

import type { CustomHtmlSection as Section } from "@/types/site-config";

/** Render HTML thô từ admin — chỉ dùng cho admin trusted content. */
export default function CustomHtml({ section }: { section: Section }) {
  const p = section.props;
  const html = (p.html ?? "").trim();
  // Bỏ qua section trống hoặc còn placeholder mặc định khi admin chưa biên tập.
  const isPlaceholder =
    html === "" || /^<div>\s*Custom\s*block\s*<\/div>$/i.test(html) || /^<p>\s*Custom\s*block\s*<\/p>$/i.test(html);
  if (isPlaceholder) return null;
  return (
    <section
      className="container mx-auto px-4 prose dark:prose-invert max-w-none"
      style={{ paddingTop: p.paddingTop ?? 40, paddingBottom: p.paddingBottom ?? 40 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
