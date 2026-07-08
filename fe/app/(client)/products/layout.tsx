import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Sản phẩm",
    description:
      "Danh mục sản phẩm VHD Corp: ống nhựa PVC, tấm cao su kỹ thuật, miến truyền thống. Báo giá B2B/B2C, giao toàn quốc.",
    canonical: `${SITE_URL}/products`,
  });
}

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
