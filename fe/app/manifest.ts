import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  return {
    name: config.brand.siteName,
    short_name: config.brand.siteName,
    description: config.seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: config.theme.colors.background,
    theme_color: config.theme.colors.primary,
    icons: [{ src: config.brand.favicon.url || "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
