"use client";

import { BrandMarquee } from "@/components/animations/brand-marquee";

/** E3 — Brand marquee tape xen giữa nội dung trang chủ */
export function HomeMarquees() {
  return (
    <>
      <BrandMarquee variant="primary" />
      <BrandMarquee variant="highlight" duration={50} />
    </>
  );
}
