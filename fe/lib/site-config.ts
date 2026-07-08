import { cache } from "react";
import type { SiteConfigDto, SiteConfigValue } from "@/types/site-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Default fallback dùng khi BE chưa sẵn sàng (lần đầu chạy / migration đang chạy).
 * Phải khớp giá trị seed.ts để tránh nháy theme.
 */
export const DEFAULT_SITE_CONFIG: SiteConfigValue = {
  brand: {
    siteName: "VHD Corp",
    tagline: "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN",
    logo: { url: "" },
    favicon: { url: "/favicon.ico" },
    ogDefaultImage: { url: "", width: 1200, height: 630 },
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
    pages: { ...DEFAULT_SITE_CONFIG.pages, ...(partial.pages ?? {}) },
    navigation: partial.navigation ?? DEFAULT_SITE_CONFIG.navigation,
    footer: { ...DEFAULT_SITE_CONFIG.footer, ...(partial.footer ?? {}) },
    customCss: partial.customCss ?? DEFAULT_SITE_CONFIG.customCss,
  };
}

export const getSiteConfig = cache(async (): Promise<SiteConfigValue> => {
  try {
    const res = await fetch(`${API_URL}/site-config`, {
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT_SITE_CONFIG;
    const json = (await res.json()) as { data?: SiteConfigDto };
    return mergeWithDefaults(json.data?.value as Partial<SiteConfigValue> | undefined);
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
});

/**
 * Generate inline CSS variables string từ theme — dùng cho `<html style="...">`.
 */
export function themeCssVars(theme: SiteConfigValue["theme"]): string {
  return [
    `--vhd-color-primary:${theme.colors.primary}`,
    `--vhd-color-accent:${theme.colors.accent}`,
    `--vhd-color-highlight:${theme.colors.highlight}`,
    `--vhd-color-danger:${theme.colors.danger}`,
    `--vhd-color-background:${theme.colors.background}`,
    `--vhd-color-surface:${theme.colors.surface}`,
    `--vhd-color-text:${theme.colors.text}`,
    `--vhd-font-heading:${theme.fonts.heading ?? "Be Vietnam Pro"}`,
    `--vhd-font-body:${theme.fonts.body ?? "Inter"}`,
    `--vhd-font-base:${(theme.fonts as { baseFontSize?: number; baseSize?: number }).baseFontSize ?? (theme.fonts as { baseFontSize?: number; baseSize?: number }).baseSize ?? 16}px`,
    `--vhd-radius:${theme.borderRadius ?? 8}px`,
  ].join(";");
}
