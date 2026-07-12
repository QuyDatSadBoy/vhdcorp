import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Không có "/" cuối để chặn cả "/admin" lẫn "/admin/*"; /search giữ crawlable để bot thấy meta noindex.
        disallow: ["/admin", "/account", "/api", "/login", "/register", "/callback"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
