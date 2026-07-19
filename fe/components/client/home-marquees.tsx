"use client";

import Image from "next/image";
import { Sparkle } from "lucide-react";
import { ScrollVelocityRow } from "@/components/animations/scroll-velocity-row";
import { useSiteConfigStore } from "@/store/site-config.store";

const Separator = () => (
  <Sparkle
    className="mx-7 inline-block h-5 w-5 align-middle text-(--vhd-color-highlight) md:mx-9 md:h-6 md:w-6"
    fill="currentColor"
    aria-hidden
  />
);

const LogoChip = ({ logo }: { logo: string }) => (
  <span className="mx-7 inline-grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white align-middle shadow-[0_4px_16px_rgba(0,0,0,0.25)] ring-1 ring-white/30 md:mx-9 md:h-13 md:w-13">
    <Image src={logo} alt="" width={52} height={52} className="h-full w-full object-contain p-0.5" />
  </span>
);

/**
 * E3 — Dải brand trước footer: MỘT dòng trên nền navy thương hiệu (đúng tông logo),
 * có logo thật xen giữa các cụm chữ trắng / gradient cyan-vàng / chữ viền.
 * Chạy chậm, có sheen nhẹ — nhìn như băng rôn thương hiệu, không phải hiệu ứng máy.
 */
export function HomeMarquees() {
  const logo = useSiteConfigStore((s) => s.config?.brand?.logo?.url) || "/images/vhdcorplogo.jpeg";

  return (
    <section
      aria-hidden
      className="relative overflow-hidden bg-linear-to-r from-[#122a68] via-(--vhd-color-primary) to-[#122a68] py-10 md:py-14"
    >
      {/* Hairline + sheen nhẹ cho cảm giác băng kim loại */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/15" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_50%_-40%,rgba(255,255,255,0.14),transparent_55%)]" />

      <ScrollVelocityRow baseVelocity={12} className="py-1">
        {/* leading ≥1.3: leading-none làm hộp nền bg-clip-text thấp hơn DẤU tiếng Việt
            (Ế Ố Á Ị) → phần dấu không được tô gradient = nhìn như bị cắt/lỗi. */}
        <span className="inline-flex items-center whitespace-nowrap py-1 font-heading text-3xl font-black uppercase leading-[1.3] tracking-tight md:text-5xl">
          <LogoChip logo={logo} />
          <span className="text-white">VHD Corp</span>
          <Separator />
          <span className="bg-linear-to-r from-(--vhd-color-accent) to-(--vhd-color-highlight) bg-clip-text text-transparent">
            Kết nối giá trị
          </span>
          <Separator />
          <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.65)]">Hợp tác vững bền</span>
          <Separator />
        </span>
      </ScrollVelocityRow>
    </section>
  );
}
