import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Tin tức",
    description: "Tin tức, bài viết và kiến thức ngành điện lạnh, cơ điện, khuôn mẫu và đúc nhựa từ VHD Corp.",
    canonical: `${SITE_URL}/posts`,
  });
}

export default function PostsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
