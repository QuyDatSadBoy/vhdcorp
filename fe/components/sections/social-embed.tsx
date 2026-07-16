"use client";

import type { SocialEmbedSection } from "@/types/site-config";
import { toFacebookPageSrc } from "@/lib/embeds";

/** Khối nhúng fanpage Facebook (Page Plugin) — dán link fanpage là chạy */
export default function SocialEmbed({ section }: { section: SocialEmbedSection }) {
  const { heading, url, height = 420 } = section.props;
  const src = toFacebookPageSrc(url, { width: 500, height });
  if (!src) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {heading && (
        <h2 className="mb-6 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">{heading}</h2>
      )}
      <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-foreground/10 shadow-lg">
        <iframe
          src={src}
          title={heading || "Fanpage Facebook"}
          width="500"
          height={height}
          className="max-w-full"
          style={{ border: 0, overflow: "hidden" }}
          loading="lazy"
          allow="encrypted-media"
          allowFullScreen
        />
      </div>
    </section>
  );
}
