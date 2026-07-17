import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sản phẩm",
    description:
      "Danh mục sản phẩm VHD Corp: gas lạnh, ống đồng, xốp bảo ôn, băng dính, gioăng cao su, dây điện và khuôn mẫu, đúc nhựa. Báo giá sỉ, giao toàn quốc.",
    canonical: `${SITE_URL}/products`,
  });
}

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
