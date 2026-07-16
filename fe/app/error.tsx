"use client";

import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";

/** Trang lỗi runtime toàn cục — tone thương hiệu, luôn có nút thử lại + về trang chủ. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-background px-4 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#1B3A8C]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#C8102E]/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-lg text-center">
        <p className="bg-[linear-gradient(100deg,#1B3A8C_25%,#F5A623_60%,#C8102E_90%)] bg-clip-text font-heading text-6xl font-black text-transparent md:text-7xl">
          Ôi, có lỗi rồi!
        </p>
        <p className="mx-auto mt-4 max-w-md text-pretty text-sm text-foreground/65">
          Đã có sự cố ngoài ý muốn. Bạn hãy thử tải lại trang — nếu vẫn lỗi, quay về trang chủ hoặc liên hệ hỗ trợ giúp
          chúng tôi nhé.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-6 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-card px-6 text-sm font-semibold transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
