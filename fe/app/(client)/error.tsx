"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCcw, Home } from "lucide-react";

/**
 * Error boundary cho nhóm trang client — lỗi runtime hiện thông báo brand
 * kèm nút thử lại thay vì màn hình trắng/stack trace.
 */
export default function ClientError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Lỗi trang client:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-2xl">⚠️</div>
      <div>
        <h1 className="text-xl font-bold text-foreground">Có lỗi xảy ra khi tải trang</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Xin lỗi vì sự bất tiện — bạn có thể thử tải lại, hoặc quay về trang chủ. Nếu lỗi lặp lại, hãy liên hệ với
          chúng tôi.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary/90"
        >
          <RefreshCcw className="h-4 w-4" /> Thử lại
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5"
        >
          <Home className="h-4 w-4" /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}
