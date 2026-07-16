"use client";

import Link from "next/link";
import type { ImageBannerSection } from "@/types/site-config";

/** Khối banner ảnh — 1 ảnh full-width, tùy chọn gắn link */
export default function ImageBanner({ section }: { section: ImageBannerSection }) {
  const { image, link, alt, maxHeight } = section.props;
  if (!image?.trim()) return null;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- URL admin cấu hình (Cloudinary/bất kỳ)
    <img
      src={image}
      alt={alt || "Banner"}
      className="w-full rounded-2xl object-cover shadow-lg"
      style={maxHeight ? { maxHeight, objectFit: "cover" } : undefined}
      loading="lazy"
    />
  );
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {link?.trim() ? (
        link.startsWith("/") ? (
          <Link href={link} className="block transition-transform hover:scale-[1.01]">
            {img}
          </Link>
        ) : (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:scale-[1.01]"
          >
            {img}
          </a>
        )
      ) : (
        img
      )}
    </section>
  );
}
