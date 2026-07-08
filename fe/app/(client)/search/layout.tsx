import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Tìm kiếm",
    description: "Tìm kiếm sản phẩm và bài viết trên VHD Corp.",
    noindex: true,
  });
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
