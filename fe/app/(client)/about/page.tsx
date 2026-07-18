import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/components/seo/json-ld";
import { PageRenderer } from "@/components/sections";
import { defaultAboutSections } from "@/lib/default-sections";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Giới thiệu",
    description:
      "VHD Corp — kho tổng vật tư điện lạnh, cơ điện và nhà sản xuất khuôn mẫu, đúc nhựa. Sứ mệnh, tầm nhìn, giá trị cốt lõi và hành trình phục vụ B2B/B2C.",
    canonical: `${SITE_URL}/about`,
  });
}

export default async function AboutPage() {
  const config = await getSiteConfig();
  const sections = config.pages.about?.sections ?? [];

  // Layout từ Page Builder; chưa cấu hình → layout mẫu (cùng nguồn với nút
  // "Tải layout mẫu" trong builder) để client và preview luôn giống hệt nhau.
  return <PageRenderer sections={sections.length > 0 ? sections : defaultAboutSections()} />;
}
