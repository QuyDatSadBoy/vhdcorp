/**
 * SiteConfig types — đồng bộ với BE schema (xem docs/PRD.md mục 4.7).
 * Admin Page Builder ghi vào / đọc từ cấu trúc này.
 */

export type SectionType =
  | "hero"
  | "featured-products"
  | "category-grid"
  | "banner-slider"
  | "blog-preview"
  | "testimonials"
  | "contact-cta"
  | "stats-counter"
  | "partners"
  | "industries"
  | "process"
  | "feature-showcase"
  | "use-cases"
  | "faq-accordion"
  | "comparison-table"
  | "custom-html";

export type AnimationType =
  | "none"
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "zoom-in";

export type SpacingPreset = "compact" | "normal" | "spacious";

export interface CommonSectionProps {
  paddingTop?: number;
  paddingBottom?: number;
  background?: { type: "none" | "color" | "image" | "gradient"; value?: string };
  animation?: AnimationType;
  animationDelay?: number;
}

export interface BaseSection<TType extends SectionType, TProps> {
  id: string;
  type: TType;
  order: number;
  visible: boolean;
  props: TProps & CommonSectionProps;
}

export type HeroSection = BaseSection<"hero", {
  heading: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
  bgImage?: string;
  overlayOpacity?: number;
  align?: "left" | "center" | "right";
  minHeight?: number;
  videoUrl?: string;
  videoThumbnail?: string;
}>;

export type FeaturedProductsSection = BaseSection<"featured-products", {
  heading: string;
  limit?: number;
  categoryId?: number;
  layout?: "grid" | "carousel";
}>;

export type CategoryGridSection = BaseSection<"category-grid", {
  heading: string;
  categoryIds: number[];
  columns?: number;
}>;

export type BannerSliderSection = BaseSection<"banner-slider", {
  slides: { image: string; link?: string; alt?: string }[];
  autoplay?: boolean;
  interval?: number;
}>;

export type BlogPreviewSection = BaseSection<"blog-preview", {
  heading: string;
  limit?: number;
  layout?: "list" | "grid";
  tagFilter?: string;
}>;

export type TestimonialsSection = BaseSection<"testimonials", {
  quotes: { name: string; role?: string; company?: string; avatar?: string; quote: string }[];
  autoplay?: boolean;
}>;

export type ContactCtaSection = BaseSection<"contact-cta", {
  heading: string;
  body?: string;
  ctaText: string;
  ctaLink: string;
  bgColor?: string;
}>;

export type StatsCounterSection = BaseSection<"stats-counter", {
  heading?: string;
  stats: { label: string; value: number; unit?: string }[];
}>;

export type PartnersSection = BaseSection<"partners", {
  heading?: string;
  logos: { image: string; name: string; link?: string }[];
  grayscale?: boolean;
  speed?: number;
}>;

export type CustomHtmlSection = BaseSection<"custom-html", {
  html: string;
}>;

export type IndustriesSection = BaseSection<"industries", {
  heading?: string;
  subheading?: string;
  items?: {
    icon?: string;
    title: string;
    description: string;
    href?: string;
    bullets?: string[];
    accent?: "primary" | "accent" | "highlight" | "danger";
  }[];
}>;

export type ProcessSection = BaseSection<"process", {
  heading?: string;
  subheading?: string;
  steps?: { title: string; description: string }[];
}>;

export type FeatureShowcaseSection = BaseSection<"feature-showcase", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  bullets?: string[];
  ctaText?: string;
  ctaLink?: string;
  imageSide?: "left" | "right";
  videoUrl?: string;
  thumbnailUrl?: string;
  badge?: string;
}>;

export type UseCasesSection = BaseSection<"use-cases", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  cases?: {
    emoji: string;
    title: string;
    description: string;
    href?: string;
    badge?: string;
  }[];
  columns?: 3 | 4;
}>;

export type FaqAccordionSection = BaseSection<"faq-accordion", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  items?: { question: string; answer: string }[];
}>;

export type ComparisonTableSection = BaseSection<"comparison-table", {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  columnHeaders?: string[];
  rows?: { label: string; values: string[]; highlight?: boolean }[];
}>;

export type Section =
  | HeroSection
  | FeaturedProductsSection
  | CategoryGridSection
  | BannerSliderSection
  | BlogPreviewSection
  | TestimonialsSection
  | ContactCtaSection
  | StatsCounterSection
  | PartnersSection
  | IndustriesSection
  | ProcessSection
  | FeatureShowcaseSection
  | UseCasesSection
  | FaqAccordionSection
  | ComparisonTableSection
  | CustomHtmlSection;

export interface PageSchema {
  sections: Section[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  order: number;
  external?: boolean;
  children?: NavItem[];
}

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface FooterConfig {
  columns: FooterColumn[];
  social: { platform: string; url: string }[];
  copyright: string;
  showMap?: boolean;
  /** Thông tin liên hệ admin có thể tùy chỉnh — hiển thị ở footer + floating widget */
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    hotline?: string;
    /** Cho phép hiển thị floating contact widget (Messenger / Zalo / Hotline) */
    floatingWidget?: boolean;
    messengerUrl?: string;
    zaloUrl?: string;
  };
}

export interface BrandConfig {
  siteName: string;
  tagline: string;
  logo: { url: string; publicId?: string };
  favicon: { url: string };
  ogDefaultImage: { url: string; width?: number; height?: number };
}

export interface ThemeConfig {
  colors: {
    primary: string;
    accent: string;
    highlight: string;
    danger: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    baseFontSize: number;
  };
  spacing: SpacingPreset;
  borderRadius: number;
}

export interface SeoConfig {
  titleTemplate: string;
  defaultDescription: string;
  defaultKeywords?: string[];
  ogImage?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
}

export interface SiteConfigValue {
  brand: BrandConfig;
  theme: ThemeConfig;
  seo: SeoConfig;
  pages: {
    home: PageSchema;
    about: PageSchema;
    contact: PageSchema;
    [key: string]: PageSchema;
  };
  navigation: NavItem[];
  footer: FooterConfig;
  customCss?: string;
}

export interface SiteConfigDto {
  id: number;
  key: string;
  value: SiteConfigValue;
  version: number;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  createdAt: string;
}
