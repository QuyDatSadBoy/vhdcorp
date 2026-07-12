import type { Metadata } from "next";
import { getSiteConfig } from "./site-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

interface BuildMetadataInput {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  keywords?: string[];
}

/**
 * Build Next.js Metadata theo SiteConfig.seo + override per page.
 * - Title 50-60 ký tự, description 150-160 ký tự (theo Lighthouse SEO).
 * - Canonical mặc định self-referential.
 * - OG/Twitter image full URL.
 */
export async function buildMetadata(input: BuildMetadataInput = {}): Promise<Metadata> {
  const siteConfig = await getSiteConfig();
  const seo = siteConfig.seo;
  const brand = siteConfig.brand;

  const rawTitle = input.title ? seo.titleTemplate.replace("%s", input.title) : `${brand.siteName} — ${brand.tagline}`;
  const title = rawTitle.length > 60 ? rawTitle.slice(0, 57).trimEnd() + "…" : rawTitle;
  const description = (input.description ?? seo.defaultDescription).slice(0, 160);
  const rawImage = input.image ?? seo.ogImage ?? brand.ogDefaultImage.url;
  const image = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${APP_URL}${rawImage.startsWith("/") ? rawImage : `/${rawImage}`}`
    : undefined;
  const canonical = input.canonical ?? "/";
  const keywords = input.keywords ?? seo.defaultKeywords;

  return {
    metadataBase: new URL(APP_URL),
    title,
    description,
    keywords,
    authors: [{ name: brand.siteName ?? "VHD Corp" }],
    creator: brand.siteName ?? "VHD Corp",
    publisher: brand.siteName ?? "VHD Corp",
    applicationName: brand.siteName ?? "VHD Corp",
    alternates: { canonical },
    openGraph: {
      type: input.type === "article" ? "article" : "website",
      siteName: brand.siteName,
      title,
      description,
      url: canonical,
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: input.noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
    icons: {
      icon: [
        { url: brand.favicon.url || "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
    category: input.type === "product" ? "shopping" : "business",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}
