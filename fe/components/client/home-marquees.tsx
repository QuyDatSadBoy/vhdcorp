"use client";

import { ScrollVelocityRow } from "@/components/animations/scroll-velocity-row";

/**
 * E3 — Dải brand trước footer: MỘT dòng duy nhất, chậm và sang
 * (bản cũ 4 dải chạy chồng nhau gây loạn mắt). Chữ đặc / chữ viền /
 * chữ gradient xen kẽ + glow hai bên cho chiều sâu.
 */
export function HomeMarquees() {
  return (
    <section
      aria-hidden
      className="relative overflow-hidden border-y border-foreground/8 bg-linear-to-r from-brand-primary/6 via-transparent to-brand-accent/6 py-14 md:py-20"
    >
      {/* Glow mềm hai bên — tạo chiều sâu, không che chữ */}
      <div className="pointer-events-none absolute -left-28 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-(--vhd-color-accent)/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-(--vhd-color-highlight)/15 blur-3xl" />

      <ScrollVelocityRow baseVelocity={14} className="py-2">
        <span className="font-heading text-4xl font-black uppercase leading-[1.2] tracking-tight md:text-6xl">
          <span className="text-foreground/90">Kết nối giá trị</span>
          <span className="mx-8 inline-block align-middle text-2xl text-brand-highlight md:text-3xl">✦</span>
          <span className="text-transparent [-webkit-text-stroke:2px_color-mix(in_srgb,var(--vhd-color-primary)_55%,transparent)]">
            Hợp tác vững bền
          </span>
          <span className="mx-8 inline-block align-middle text-2xl text-brand-accent md:text-3xl">✦</span>
          <span className="bg-linear-to-r from-brand-primary via-brand-accent to-brand-highlight bg-clip-text text-transparent">
            VHD Corp
          </span>
          <span className="mx-8 inline-block align-middle text-2xl text-brand-primary md:text-3xl">✦</span>
        </span>
      </ScrollVelocityRow>
    </section>
  );
}
