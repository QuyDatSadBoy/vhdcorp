import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Home, Package, Headset } from "lucide-react";

export const metadata: Metadata = {
  title: "404 — Không tìm thấy trang | VHD Corp",
  robots: { index: false, follow: true },
};

/** Trang 404 theo tone thương hiệu (xanh/vàng/đỏ logo) — luôn có đường thoát rõ ràng. */
export default function NotFound() {
  return (
    <main className="relative flex min-h-[100vh] items-center justify-center overflow-hidden bg-background px-4 py-20">
      {/* Nền brand: 2 quầng màu logo + lưới mờ */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#1B3A8C]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#F5A623]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative mx-auto max-w-xl text-center">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="VHD Corp — về trang chủ">
          <Image src="/images/vhdcorplogo.jpeg" alt="VHD Corp" width={44} height={44} className="rounded-xl" />
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold">VHD Corp</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
              Kết nối giá trị · Hợp tác vững bền
            </span>
          </span>
        </Link>

        {/* 404 gradient 3 màu logo */}
        <p className="mt-8 bg-[linear-gradient(100deg,#1B3A8C_20%,#F5A623_55%,#C8102E_85%)] bg-clip-text font-heading text-[7rem] font-black leading-none tracking-tight text-transparent md:text-[9rem]">
          404
        </p>

        <h1 className="mt-2 text-balance text-2xl font-bold md:text-3xl">Không tìm thấy trang bạn yêu cầu</h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-foreground/65">
          Đường dẫn có thể đã thay đổi hoặc không còn tồn tại — quay lại trang chủ hoặc khám phá sản phẩm bên dưới.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-6 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-card px-6 text-sm font-semibold transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Package className="h-4 w-4" /> Xem sản phẩm
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-foreground/70 transition-colors hover:text-brand-primary"
          >
            <Headset className="h-4 w-4" /> Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </main>
  );
}
