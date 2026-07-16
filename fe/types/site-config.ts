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
  | "sticky-story"
  | "custom-html"
  | "google-map"
  | "video-embed"
  | "social-embed"
  | "image-banner";

export type AnimationType = "none" | "fade-up" | "fade-in" | "slide-left" | "zoom-in";

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

export type HeroSection = BaseSection<
  "hero",
  {
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
    /** Nhãn nhỏ cạnh tên site trên hero (mặc định B2B) */
    badge?: string;
    /** 3 chip cam kết dưới nút CTA — admin sửa label/desc, thêm/xóa */
    trustItems?: { label: string; desc: string }[];
  }
>;

export type FeaturedProductsSection = BaseSection<
  "featured-products",
  {
    heading: string;
    limit?: number;
    categoryId?: number;
    layout?: "grid" | "carousel";
  }
>;

export type CategoryGridSection = BaseSection<
  "category-grid",
  {
    heading: string;
    categoryIds: number[];
    columns?: number;
  }
>;

export type BannerSliderSection = BaseSection<
  "banner-slider",
  {
    slides: { image: string; link?: string; alt?: string }[];
    autoplay?: boolean;
    interval?: number;
    /** "banners" → lấy slide từ trang Quản trị → Banner (theo vị trí bên dưới) thay vì slides tự nhập */
    source?: "manual" | "banners";
    /** Vị trí banner cần lấy khi source="banners" (mặc định home-hero) */
    bannerPosition?: string;
  }
>;

export type BlogPreviewSection = BaseSection<
  "blog-preview",
  {
    heading: string;
    limit?: number;
    layout?: "list" | "grid";
    tagFilter?: string;
  }
>;

export type TestimonialsSection = BaseSection<
  "testimonials",
  {
    quotes: { name: string; role?: string; company?: string; avatar?: string; quote: string }[];
    autoplay?: boolean;
  }
>;

export type ContactCtaSection = BaseSection<
  "contact-cta",
  {
    heading: string;
    body?: string;
    ctaText: string;
    ctaLink: string;
    bgColor?: string;
  }
>;

export type StatsCounterSection = BaseSection<
  "stats-counter",
  {
    heading?: string;
    stats: { label: string; value: number; unit?: string }[];
  }
>;

export type PartnersSection = BaseSection<
  "partners",
  {
    heading?: string;
    logos: { image: string; name: string; link?: string }[];
    grayscale?: boolean;
    speed?: number;
  }
>;

export type CustomHtmlSection = BaseSection<
  "custom-html",
  {
    html: string;
  }
>;

export type IndustriesSection = BaseSection<
  "industries",
  {
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
  }
>;

export type ProcessSection = BaseSection<
  "process",
  {
    heading?: string;
    subheading?: string;
    steps?: { title: string; description: string }[];
  }
>;

export type FeatureShowcaseSection = BaseSection<
  "feature-showcase",
  {
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
  }
>;

export type UseCasesSection = BaseSection<
  "use-cases",
  {
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
  }
>;

export type FaqAccordionSection = BaseSection<
  "faq-accordion",
  {
    eyebrow?: string;
    heading: string;
    subheading?: string;
    items?: { question: string; answer: string }[];
  }
>;

export type ComparisonTableSection = BaseSection<
  "comparison-table",
  {
    eyebrow?: string;
    heading: string;
    subheading?: string;
    columnHeaders?: string[];
    rows?: { label: string; values: string[]; highlight?: boolean }[];
  }
>;

export type StickyStorySection = BaseSection<
  "sticky-story",
  {
    eyebrow?: string;
    heading: string;
    subheading?: string;
    steps?: {
      title: string;
      description: string;
      icon?: string;
    }[];
  }
>;

export type GoogleMapSection = BaseSection<
  "google-map",
  {
    heading?: string;
    /** Dán mã iframe / link nhúng / địa chỉ / link Google Maps — tự chuẩn hóa */
    embed: string;
    height?: number;
  }
>;

export type VideoEmbedSection = BaseSection<
  "video-embed",
  {
    heading?: string;
    /** Link YouTube / TikTok / Facebook video / Vimeo — tự nhận diện */
    url: string;
  }
>;

export type SocialEmbedSection = BaseSection<
  "social-embed",
  {
    heading?: string;
    /** Link fanpage Facebook — nhúng Page Plugin (timeline) */
    url: string;
    height?: number;
  }
>;

export type ImageBannerSection = BaseSection<
  "image-banner",
  {
    image: string;
    link?: string;
    alt?: string;
    /** Chiều cao tối đa px (mặc định tự nhiên theo ảnh) */
    maxHeight?: number;
  }
>;

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
  | StickyStorySection
  | CustomHtmlSection
  | GoogleMapSection
  | VideoEmbedSection
  | SocialEmbedSection
  | ImageBannerSection;

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

/** Icon cho dải cam kết footer */
export type TrustBadgeIcon = "shield" | "truck" | "headphones" | "award" | "star" | "clock" | "leaf" | "thumbsup";

/** Icon preset cho kênh liên hệ nổi — xem CHANNEL_PRESETS ở floating-contact.tsx */
export type ContactChannelIcon =
  | "facebook"
  | "messenger"
  | "zalo"
  | "phone"
  | "email"
  | "tiktok"
  | "youtube"
  | "instagram"
  | "linkedin"
  | "telegram"
  | "whatsapp"
  | "link";

/** Một kênh trong floating contact widget — admin thêm/xóa/sắp xếp tự do */
export interface ContactChannel {
  id: string;
  icon: ContactChannelIcon;
  /** Nhãn hiển thị; để trống → dùng nhãn mặc định theo icon */
  label?: string;
  /** URL đầy đủ (https://…), số điện thoại (tự thành tel:) hoặc email (tự thành mailto:) */
  url: string;
  /** Ảnh icon tùy chỉnh admin tải lên (Cloudinary) — có thì dùng thay icon preset */
  image?: string;
}

export interface FooterConfig {
  columns: FooterColumn[];
  social: { platform: string; url: string }[];
  copyright: string;
  showMap?: boolean;
  /** Google Maps — admin dán mã iframe / link / địa chỉ (hiện ở footer khi showMap bật) */
  mapEmbed?: string;
  /** Link fanpage Facebook — nhúng Page Plugin ở footer */
  facebookPage?: string;
  /** Dải cam kết trên footer (Cam kết chất lượng, Giao toàn quốc…) — admin sửa 100% */
  trustBadges?: { icon: TrustBadgeIcon; label: string; desc: string }[];
  /** Mô tả ngắn về công ty hiển thị ở cột đầu footer */
  description?: string;
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
    /**
     * Kênh liên hệ nổi tùy chỉnh 100% (icon + nhãn + link, thứ tự tự do).
     * Có kênh nào ở đây → floating widget CHỈ hiển thị danh sách này;
     * để trống → tự suy ra từ messengerUrl/zaloUrl/hotline/email ở trên.
     */
    channels?: ContactChannel[];
  };
}

export interface BrandConfig {
  siteName: string;
  tagline: string;
  logo: { url: string; publicId?: string };
  /** Icon nút Trợ lý AI (mascot) — thay được trong Cài đặt site → Brand */
  assistantIcon?: { url: string };
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

/** Chữ hero/tiêu đề của KHỐI CỐ ĐỊNH (form liên hệ, danh sách SP/bài viết) — sửa trong Builder */
export interface FixedBlockHero {
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Ảnh nền hero của khối cố định (tùy chọn) */
  heroImage?: string;
}
export interface FixedBlocksConfig {
  contact?: FixedBlockHero & {
    infoHeading?: string;
    infoDescription?: string;
    formHeading?: string;
    formDescription?: string;
  };
  products?: FixedBlockHero;
  posts?: FixedBlockHero;
}

export interface HeaderConfig {
  /** Dòng promo strip phía trên header — để trống sẽ ẩn */
  promoText?: string;
  showPromo?: boolean;
}

/** Cấu hình EMAIL — admin chỉnh mọi mail hệ thống (branding + subject/intro từng loại) */
export interface MailTemplateOverride {
  subject?: string;
  intro?: string;
}
export interface MailConfig {
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  address?: string;
  copyright?: string;
  footerNote?: string;
  templates?: {
    contactNotify?: MailTemplateOverride;
    contactConfirm?: MailTemplateOverride;
    orderNotify?: MailTemplateOverride;
    orderConfirm?: MailTemplateOverride;
  };
}

export interface SiteConfigValue {
  brand: BrandConfig;
  theme: ThemeConfig;
  seo: SeoConfig;
  header?: HeaderConfig;
  pages: {
    home: PageSchema;
    about: PageSchema;
    contact: PageSchema;
    [key: string]: PageSchema;
  };
  navigation: NavItem[];
  footer: FooterConfig;
  /** Nội dung khối cố định của trang liên hệ / sản phẩm / tin tức */
  fixedBlocks?: FixedBlocksConfig;
  /** Cấu hình email hệ thống (branding + nội dung từng loại mail) */
  mail?: MailConfig;
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
