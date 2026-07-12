import type { SiteConfigValue } from "@/types/site-config";

/**
 * Theme utils — client-safe (không import next/headers).
 * Dùng chung cho SSR inject (<style> trong layout) và live preview (store.applyTheme).
 */

/** Font mặc định đã được next/font preload (không cần Google Fonts link). */
export const BUILTIN_FONTS = ["Be Vietnam Pro", "Inter"];

/** Spacing preset → Tailwind v4 `--spacing` base unit (mặc định 0.25rem). */
export const SPACING_SCALE: Record<string, string> = {
  compact: "0.22rem",
  normal: "0.25rem",
  spacious: "0.29rem",
};

function readBaseFontSize(fonts: SiteConfigValue["theme"]["fonts"]): number {
  const f = fonts as { baseFontSize?: number; baseSize?: number };
  return f.baseFontSize ?? f.baseSize ?? 16;
}

/**
 * Map CSS variables từ theme.
 * - `--font-heading/--font-body`: stack đầy đủ (font config → next/font fallback)
 *   để đổi font trong admin có hiệu lực thật.
 * - `--spacing`: base unit của mọi utility spacing Tailwind v4 → preset compact/spacious
 *   scale toàn bộ khoảng cách của site.
 */
export function themeCssVarsMap(theme: SiteConfigValue["theme"]): Record<string, string> {
  const heading = theme.fonts.heading ?? "Be Vietnam Pro";
  const body = theme.fonts.body ?? "Inter";
  return {
    "--vhd-color-primary": theme.colors.primary,
    "--vhd-color-accent": theme.colors.accent,
    "--vhd-color-highlight": theme.colors.highlight,
    "--vhd-color-danger": theme.colors.danger,
    "--vhd-color-background": theme.colors.background,
    "--vhd-color-surface": theme.colors.surface,
    "--vhd-color-text": theme.colors.text,
    "--font-heading": `"${heading}",var(--font-heading-base),"Be Vietnam Pro",system-ui,sans-serif`,
    "--font-body": `"${body}",var(--font-body-base),Inter,system-ui,sans-serif`,
    "--vhd-font-base": `${readBaseFontSize(theme.fonts)}px`,
    "--vhd-radius": `${theme.borderRadius ?? 8}px`,
    "--spacing": SPACING_SCALE[theme.spacing] ?? SPACING_SCALE.normal,
  };
}

/** Inline CSS string cho `<style>:root{...}</style>` trong <head>. */
export function themeCssVars(theme: SiteConfigValue["theme"]): string {
  return Object.entries(themeCssVarsMap(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * Google Fonts stylesheet URL cho các font admin chọn ngoài bộ built-in.
 * Trả về null nếu cả 2 font đều là built-in (đã preload qua next/font).
 */
export function googleFontsUrl(theme: SiteConfigValue["theme"]): string | null {
  const families = [theme.fonts.heading, theme.fonts.body]
    .filter((f): f is string => Boolean(f) && !BUILTIN_FONTS.includes(f))
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...new Set(families)].join("&")}&display=swap`;
}
