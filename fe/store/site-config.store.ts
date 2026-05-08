import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SiteConfigValue } from "@/types/site-config";

/**
 * Site config store — hydrate từ server, dùng cho live preview Builder.
 * Khi `applyTheme()` được gọi: ghi CSS variables vào :root để mọi component reactively cập nhật.
 */
interface SiteConfigState {
  config: SiteConfigValue | null;
  draft: SiteConfigValue | null;
}

interface SiteConfigActions {
  setConfig: (config: SiteConfigValue) => void;
  setDraft: (draft: SiteConfigValue | null) => void;
  applyTheme: (theme: SiteConfigValue["theme"]) => void;
}

const cssVarsFromTheme = (theme: SiteConfigValue["theme"]): Record<string, string> => ({
  "--vhd-color-primary": theme.colors.primary,
  "--vhd-color-accent": theme.colors.accent,
  "--vhd-color-highlight": theme.colors.highlight,
  "--vhd-color-danger": theme.colors.danger,
  "--vhd-color-background": theme.colors.background,
  "--vhd-color-surface": theme.colors.surface,
  "--vhd-color-text": theme.colors.text,
  "--vhd-font-heading": theme.fonts.heading,
  "--vhd-font-body": theme.fonts.body,
  "--vhd-font-base": `${theme.fonts.baseFontSize}px`,
  "--vhd-radius": `${theme.borderRadius}px`,
});

export const useSiteConfigStore = create<SiteConfigState & SiteConfigActions>()(
  devtools(
    (set, get) => ({
      config: null,
      draft: null,
      setConfig: (config) => {
        set({ config }, false, "siteConfig/setConfig");
        get().applyTheme(config.theme);
      },
      setDraft: (draft) => set({ draft }, false, "siteConfig/setDraft"),
      applyTheme: (theme) => {
        if (typeof window === "undefined") return;
        const root = document.documentElement;
        const vars = cssVarsFromTheme(theme);
        for (const [k, v] of Object.entries(vars)) {
          root.style.setProperty(k, v);
        }
      },
    }),
    { name: "SiteConfigStore" },
  ),
);
