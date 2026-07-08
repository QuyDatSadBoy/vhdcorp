import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Admin Portal",
    description: "Cổng đăng nhập quản trị VHD Corp.",
    noindex: true,
  });
}

// Override admin layout — không có sidebar ở trang login
export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
