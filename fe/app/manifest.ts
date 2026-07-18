import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  // Favicon có thể là .ico / .svg / .png (Cloudinary) — khai báo đúng type & sizes
  // để trình duyệt không cảnh báo "Resource size is not correct".
  const fav = config.brand.favicon.url || "/favicon.ico";
  const favType = fav.endsWith(".svg") ? "image/svg+xml" : fav.endsWith(".ico") ? "image/x-icon" : "image/png";
  const favSizes = favType === "image/png" ? "32x32" : "any";
  return {
    name: config.brand.siteName,
    short_name: config.brand.siteName,
    description: config.seo.defaultDescription,
    start_url: "/",
    display: "standalone",
    background_color: config.theme.colors.background,
    theme_color: config.theme.colors.primary,
    icons: [
      { src: fav, sizes: favSizes, type: favType },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
