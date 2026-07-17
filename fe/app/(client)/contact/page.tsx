import type { Metadata } from "next";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { PageRenderer } from "@/components/sections";
import ContactForm from "./_components/contact-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Liên hệ",
    description:
      "Liên hệ VHD Corp để nhận tư vấn báo giá sỉ vật tư điện lạnh, cơ điện (M&E) và dịch vụ khuôn mẫu, đúc nhựa — hỗ trợ 24/7, giao toàn quốc.",
    canonical: `${SITE_URL}/contact`,
  });
}

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Liên hệ", item: `${SITE_URL}/contact` },
  ],
};

export default async function ContactPage() {
  const config = await getSiteConfig();
  // Page Builder: sections admin cấu hình cho trang contact (nếu có) render phía trên form
  const sections = config.pages?.contact?.sections ?? [];

  const contact = config.footer?.contact;
  // Chuỗi rỗng → undefined để JSON.stringify loại bỏ field khỏi JSON-LD
  const tel = contact?.hotline || contact?.phone || undefined;
  const socials = (config.footer?.social ?? []).map((s) => s.url).filter((u): u is string => Boolean(u));
  const logoUrl = config.brand?.logo?.url
    ? config.brand.logo.url.startsWith("http")
      ? config.brand.logo.url
      : `${SITE_URL}${config.brand.logo.url}`
    : undefined;

  // JSON-LD LocalBusiness derive từ SiteConfig — chỉ khai báo field có dữ liệu thật
  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: config.brand?.siteName,
    description: config.seo?.defaultDescription || undefined,
    url: SITE_URL,
    logo: logoUrl,
    image: logoUrl,
    telephone: tel,
    email: contact?.email || undefined,
    address: contact?.address
      ? {
          "@type": "PostalAddress",
          streetAddress: contact.address,
          addressCountry: "VN",
        }
      : undefined,
    sameAs: socials.length > 0 ? socials : undefined,
    contactPoint: tel
      ? [
          {
            "@type": "ContactPoint",
            telephone: tel,
            contactType: "customer service",
            areaServed: "VN",
            availableLanguage: ["Vietnamese", "English"],
          },
        ]
      : undefined,
  };

  return (
    <>
      <JsonLd id="localbusiness" data={localBusinessLd} />
      <JsonLd id="breadcrumb" data={breadcrumbLd} />
      {sections.length > 0 && <PageRenderer sections={sections} />}
      <ContactForm />
    </>
  );
}
