"use client";

import type { GoogleMapSection } from "@/types/site-config";
import { toMapEmbedSrc } from "@/lib/embeds";

/** Khối Google Maps — admin dán iframe/link/địa chỉ là chạy */
export default function GoogleMap({ section }: { section: GoogleMapSection }) {
  const { heading, embed, height = 420 } = section.props;
  const src = toMapEmbedSrc(embed);
  if (!src) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {heading && (
        <h2 className="mb-6 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">{heading}</h2>
      )}
      <div className="overflow-hidden rounded-2xl border border-foreground/10 shadow-lg">
        <iframe
          src={src}
          title={heading || "Bản đồ"}
          width="100%"
          height={height}
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
