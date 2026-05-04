import type { ReactNode } from "react";

// Override admin layout — không có sidebar ở trang login
export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
