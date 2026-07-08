import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Tài khoản",
    description: "Đăng nhập / đăng ký tài khoản VHD Corp để quản lý đơn hàng và nhận ưu đãi B2B/B2C.",
    noindex: true,
  });
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
