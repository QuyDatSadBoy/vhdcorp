import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Không tìm thấy trang | VHD Corp",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-linear-to-br from-background via-background to-brand-primary/5 px-4 py-20">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">Lỗi 404</p>
        <h1 className="mt-4 text-balance text-4xl font-bold leading-tight md:text-5xl">
          Không tìm thấy trang bạn yêu cầu
        </h1>
        <p className="mt-4 text-pretty text-foreground/70">
          Đường dẫn có thể đã thay đổi hoặc không còn tồn tại. Vui lòng quay lại trang chủ hoặc khám phá các sản phẩm
          bên dưới.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-semibold text-brand-primary-foreground shadow-sm transition-all hover:shadow-md"
          >
            Về trang chủ
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-full border border-foreground/15 bg-card px-6 text-sm font-semibold transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Xem sản phẩm
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-foreground/70 transition-colors hover:text-brand-primary"
          >
            Liên hệ hỗ trợ →
          </Link>
        </div>
      </div>
    </main>
  );
}
