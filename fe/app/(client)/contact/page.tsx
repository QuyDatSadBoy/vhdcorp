import type { Metadata } from "next";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { buildMetadata } from "@/lib/seo";
import ContactForm from "./_components/contact-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Liên hệ",
    description:
      "Liên hệ VHD Corp để nhận tư vấn báo giá B2B/B2C ống nhựa PVC, tấm cao su kỹ thuật, miến truyền thống — hỗ trợ 24/7, giao toàn quốc.",
    canonical: `${SITE_URL}/contact`,
  });
}

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: "VHD Corp",
  alternateName: "Công ty VHD Corp",
  description:
    "Tổng kho ống nhựa PVC, tấm cao su kỹ thuật và thực phẩm làng nghề (miến) — phục vụ khách hàng B2B/B2C toàn quốc.",
  url: SITE_URL,
  logo: `${SITE_URL}/images/vhdcorplogo.jpeg`,
  image: `${SITE_URL}/images/vhdcorplogo.jpeg`,
  telephone: "+84-28-3000-0000",
  email: "contact@vhdcorp.vn",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "TP. Hồ Chí Minh",
    addressLocality: "Hồ Chí Minh",
    addressRegion: "HCM",
    postalCode: "700000",
    addressCountry: "VN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.8231,
    longitude: 106.6297,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "17:30",
    },
  ],
  areaServed: { "@type": "Country", name: "Việt Nam" },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+84-28-3000-0000",
      contactType: "customer service",
      areaServed: "VN",
      availableLanguage: ["Vietnamese", "English"],
    },
  ],
  sameAs: ["https://www.facebook.com/vhdcorp", "https://www.youtube.com/@vhdcorp", "https://zalo.me/vhdcorp"],
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Liên hệ", item: `${SITE_URL}/contact` },
  ],
};

export default function ContactPage() {
  return (
    <>
      <JsonLd id="localbusiness" data={localBusinessLd} />
      <JsonLd id="breadcrumb" data={breadcrumbLd} />
      <ContactForm />
    </>
  );
}
