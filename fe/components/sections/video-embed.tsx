"use client";

import type { VideoEmbedSection } from "@/types/site-config";
import { toVideoEmbedSrc } from "@/lib/embeds";

/** Khối video nhúng — dán link YouTube/TikTok/Facebook/Vimeo là chạy */
export default function VideoEmbed({ section }: { section: VideoEmbedSection }) {
  const { heading, url } = section.props;
  const src = toVideoEmbedSrc(url);
  if (!src) return null;
  const isTikTok = src.includes("tiktok.com");
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {heading && (
        <h2 className="mb-6 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">{heading}</h2>
      )}
      <div
        className={
          isTikTok
            ? "mx-auto max-w-[340px] overflow-hidden rounded-2xl border border-foreground/10 shadow-lg"
            : "relative overflow-hidden rounded-2xl border border-foreground/10 shadow-lg"
        }
        style={isTikTok ? undefined : { paddingBottom: "56.25%" }}
      >
        <iframe
          src={src}
          title={heading || "Video"}
          className={isTikTok ? "h-[580px] w-full" : "absolute inset-0 h-full w-full"}
          style={{ border: 0 }}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
