import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";
import { PageRenderer } from "@/components/sections";
import { defaultHomeSections } from "@/lib/default-sections";
import { JsonLd, SITE_URL } from "@/components/seo/json-ld";
import { SectionToc, type TocItem } from "@/components/client/section-toc";
import { HomeMarquees } from "@/components/client/home-marquees";

export async function generateMetadata(): Promise<Metadata> {
  // Trang chủ — dùng brand title + description từ SiteConfig.seo
  return buildMetadata({ canonical: SITE_URL });
}

const TOC_LABELS: Record<string, string> = {
  hero: "Trang chủ",
  industries: "Lĩnh vực",
  "use-cases": "Use Cases",
  "stats-counter": "Số liệu",
  "featured-products": "Sản phẩm",
  process: "Quy trình",
  "feature-showcase": "Showcase",
  testimonials: "Đánh giá",
  "blog-preview": "Tin tức",
  "contact-cta": "Liên hệ",
  partners: "Đối tác",
  "category-grid": "Danh mục",
  "banner-slider": "Banner",
  "faq-accordion": "FAQ",
  "comparison-table": "So sánh",
  "sticky-story": "Quy trình",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getSiteConfig();
  const sections = config.pages?.home?.sections?.length ? config.pages.home.sections : defaultHomeSections();

  const logoUrl = config.brand?.logo?.url
    ? config.brand.logo.url.startsWith("http")
      ? config.brand.logo.url
      : `${SITE_URL}${config.brand.logo.url}`
    : undefined;

  const socials = (config.footer?.social ?? []).map((s) => s.url).filter((u): u is string => Boolean(u));

  const contactInfo = (
    config.footer as { contact?: { hotline?: string; email?: string; address?: string } } | undefined
  )?.contact;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: config.brand?.siteName ?? "VHD Corp",
    alternateName: "VHD",
    url: SITE_URL,
    logo: logoUrl,
    image: logoUrl,
    description: config.brand?.tagline ?? "Kết nối giá trị – Hợp tác vững bền",
    sameAs: socials,
    contactPoint: contactInfo?.hotline
      ? {
          "@type": "ContactPoint",
          telephone: contactInfo.hotline,
          contactType: "customer service",
          email: contactInfo.email,
          availableLanguage: ["Vietnamese", "English"],
          areaServed: "VN",
        }
      : undefined,
    address: contactInfo?.address
      ? {
          "@type": "PostalAddress",
          streetAddress: contactInfo.address,
          addressCountry: "VN",
        }
      : undefined,
  };

  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: config.brand?.siteName ?? "VHD Corp",
    url: SITE_URL,
    inLanguage: "vi-VN",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: config.brand?.siteName ?? "VHD Corp",
    image: logoUrl,
    url: SITE_URL,
    priceRange: "$$",
    description:
      "VHD Corp — đơn vị phân phối nhựa, cao su kỹ thuật và đặc sản làng nghề Việt Nam. Phục vụ khách lẻ và doanh nghiệp, giao hàng toàn quốc.",
    address: {
      "@type": "PostalAddress",
      streetAddress: contactInfo?.address ?? "Hà Nội",
      addressLocality: "Hà Nội",
      addressCountry: "VN",
    },
    telephone: contactInfo?.hotline,
    email: contactInfo?.email,
    sameAs: socials,
  };

  const tocItems: TocItem[] = sections
    .filter((s) => s.visible && s.type !== "hero")
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: `sec-${s.type}`, label: TOC_LABELS[s.type] ?? s.type }));

  return (
    <>
      <JsonLd id="org" data={orgLd} />
      <JsonLd id="site" data={siteLd} />
      <JsonLd id="business" data={localBusinessLd} />
      <SectionToc items={tocItems} />
      <PageRenderer sections={sections} />
      <HomeMarquees />
    </>
  );
}
