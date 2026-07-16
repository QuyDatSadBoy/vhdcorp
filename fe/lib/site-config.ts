import { cache } from "react";
import type { SiteConfigDto, SiteConfigValue } from "@/types/site-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

/**
 * Default fallback dùng khi BE chưa sẵn sàng (lần đầu chạy / migration đang chạy).
 * Phải khớp giá trị seed.ts để tránh nháy theme.
 */
export const DEFAULT_SITE_CONFIG: SiteConfigValue = {
  brand: {
    siteName: "VHD Corp",
    tagline: "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN",
    logo: { url: "/images/vhdcorplogo.jpeg" },
    favicon: { url: "/icons/favicon-32.png" },
    ogDefaultImage: { url: "/images/og-default.jpg", width: 1200, height: 630 },
  },
  header: {
    promoText: "Tư vấn miễn phí · Giao hàng toàn quốc",
    showPromo: true,
  },
  theme: {
    colors: {
      primary: "#1B3A8C",
      accent: "#4FB8E7",
      highlight: "#F5A623",
      danger: "#C8102E",
      background: "#FFFFFF",
      surface: "#F7F8FA",
      text: "#1A1A2E",
    },
    fonts: { heading: "Be Vietnam Pro", body: "Inter", baseFontSize: 16 },
    spacing: "normal",
    borderRadius: 8,
  },
  seo: {
    titleTemplate: "%s | VHD Corp",
    defaultDescription: "VHD Corp — kết nối sản phẩm Việt với thị trường toàn cầu.",
  },
  pages: { home: { sections: [] }, about: { sections: [] }, contact: { sections: [] } },
  navigation: [
    { id: "nav-home", label: "Trang chủ", href: "/", order: 1 },
    { id: "nav-products", label: "Sản phẩm", href: "/products", order: 2 },
    { id: "nav-posts", label: "Tin tức", href: "/posts", order: 3 },
    { id: "nav-about", label: "Giới thiệu", href: "/about", order: 4 },
    { id: "nav-contact", label: "Liên hệ", href: "/contact", order: 5 },
  ],
  footer: {
    columns: [
      { heading: "Về chúng tôi", links: [{ label: "Giới thiệu", href: "/about" }] },
      { heading: "Sản phẩm", links: [{ label: "Tất cả sản phẩm", href: "/products" }] },
      { heading: "Hỗ trợ", links: [{ label: "Liên hệ", href: "/contact" }] },
    ],
    social: [
      { platform: "facebook", url: "" },
      { platform: "zalo", url: "" },
      { platform: "youtube", url: "" },
    ],
    copyright: "© 2026 VHD Corp. All rights reserved.",
    showMap: true,
    description: "VHD Corp — tổng kho nhựa, cao su và sản phẩm làng nghề Việt. Kết nối giá trị, hợp tác vững bền.",
    contact: {
      email: "vhdcorp.contact@gmail.com",
      phone: "0879.744.888",
      hotline: "0879.744.888",
      address: "Hà Nội",
      floatingWidget: true,
      messengerUrl: "",
      zaloUrl: "",
    },
  },
  customCss: "",
};

/**
 * Lấy site config (server-side, cache per request).
 * Fallback về DEFAULT_SITE_CONFIG nếu BE lỗi để tránh trang trắng.
 */
/**
 * Deep-merge value DB lên DEFAULT_SITE_CONFIG để không vỡ trang khi DB thiếu key
 * (ví dụ seed cũ chưa có `seo`, `customCss`, ...). Override key có trong DB.
 */
function mergeWithDefaults(partial: Partial<SiteConfigValue> | undefined): SiteConfigValue {
  if (!partial) return DEFAULT_SITE_CONFIG;
  return {
    ...DEFAULT_SITE_CONFIG,
    ...partial,
    brand: { ...DEFAULT_SITE_CONFIG.brand, ...(partial.brand ?? {}) },
    theme: {
      ...DEFAULT_SITE_CONFIG.theme,
      ...(partial.theme ?? {}),
      colors: { ...DEFAULT_SITE_CONFIG.theme.colors, ...(partial.theme?.colors ?? {}) },
      fonts: { ...DEFAULT_SITE_CONFIG.theme.fonts, ...(partial.theme?.fonts ?? {}) },
    },
    seo: { ...DEFAULT_SITE_CONFIG.seo, ...(partial.seo ?? {}) },
    header: { ...DEFAULT_SITE_CONFIG.header, ...(partial.header ?? {}) },
    pages: { ...DEFAULT_SITE_CONFIG.pages, ...(partial.pages ?? {}) },
    navigation: partial.navigation ?? DEFAULT_SITE_CONFIG.navigation,
    footer: {
      ...DEFAULT_SITE_CONFIG.footer,
      ...(partial.footer ?? {}),
      contact: { ...DEFAULT_SITE_CONFIG.footer.contact, ...(partial.footer?.contact ?? {}) },
    },
    customCss: partial.customCss ?? DEFAULT_SITE_CONFIG.customCss,
  };
}

export const getSiteConfig = cache(async (): Promise<SiteConfigValue> => {
  try {
    // Dynamic import next/headers: module này còn được client components import
    // (DEFAULT_SITE_CONFIG) — import tĩnh server-only API sẽ vỡ client bundle.
    const { cookies, draftMode } = await import("next/headers");
    // Draft preview: khi admin bật draftMode (qua /api/preview), đọc bản DRAFT
    // từ BE bằng cookie admin forward từ browser — cho phép "Xem trước" thật.
    const { isEnabled: isDraft } = await draftMode();
    if (isDraft) {
      const cookieHeader = (await cookies()).toString();
      const res = await fetch(`${API_URL}/site-config/draft`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: SiteConfigDto };
        return mergeWithDefaults(json.data?.value as Partial<SiteConfigValue> | undefined);
      }
      // Không đủ quyền / draft lỗi → rơi xuống bản published
    }
    // Real-time 100%: không cache — admin publish là mọi lượt xem tiếp theo thấy ngay.
    const res = await fetch(`${API_URL}/site-config`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_SITE_CONFIG;
    const json = (await res.json()) as { data?: SiteConfigDto };
    return mergeWithDefaults(json.data?.value as Partial<SiteConfigValue> | undefined);
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
});

// Theme utils tách sang lib/theme.ts (client-safe) — re-export để giữ import cũ.
export { themeCssVars, googleFontsUrl, BUILTIN_FONTS } from "./theme";
