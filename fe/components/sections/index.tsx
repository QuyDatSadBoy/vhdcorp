"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CommonSectionProps, Section } from "@/types/site-config";
import HeroSection from "./hero";
import FeaturedProducts from "./featured-products";
import CategoryGrid from "./category-grid";
import BannerSlider from "./banner-slider";
import BlogPreview from "./blog-preview";
import Testimonials from "./testimonials";
import ContactCta from "./contact-cta";
import StatsCounter from "./stats-counter";
import Partners from "./partners";
import IndustriesSection from "./industries";
import ProcessSection from "./process";
import FeatureShowcase from "./feature-showcase";
import UseCases from "./use-cases";
import FaqAccordion from "./faq-accordion";
import ComparisonTable from "./comparison-table";
import StickyStory from "./sticky-story";
import CustomHtml from "./custom-html";
import GoogleMap from "./google-map";
import VideoEmbed from "./video-embed";
import SocialEmbed from "./social-embed";
import ImageBanner from "./image-banner";

/**
 * Dispatcher render section đúng component theo type.
 * Dùng cho cả homepage runtime và Builder live preview.
 */
export function SectionRenderer({ section }: { section: Section }) {
  if (!section.visible) return null;
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} />;
    case "featured-products":
      return <FeaturedProducts section={section} />;
    case "category-grid":
      return <CategoryGrid section={section} />;
    case "banner-slider":
      return <BannerSlider section={section} />;
    case "blog-preview":
      return <BlogPreview section={section} />;
    case "testimonials":
      return <Testimonials section={section} />;
    case "contact-cta":
      return <ContactCta section={section} />;
    case "stats-counter":
      return <StatsCounter section={section} />;
    case "partners":
      return <Partners section={section} />;
    case "industries":
      return <IndustriesSection section={section} />;
    case "process":
      return <ProcessSection section={section} />;
    case "feature-showcase":
      return <FeatureShowcase section={section} />;
    case "use-cases":
      return <UseCases section={section} />;
    case "faq-accordion":
      return <FaqAccordion section={section} />;
    case "comparison-table":
      return <ComparisonTable section={section} />;
    case "sticky-story":
      return <StickyStory section={section} />;
    case "custom-html":
      return <CustomHtml section={section} />;
    case "google-map":
      return <GoogleMap section={section} />;
    case "video-embed":
      return <VideoEmbed section={section} />;
    case "social-embed":
      return <SocialEmbed section={section} />;
    case "image-banner":
      return <ImageBanner section={section} />;
    default:
      return null;
  }
}

/** Các section tự xử lý paddingTop/Bottom BÊN TRONG (giữ ngữ nghĩa cũ) — wrapper bỏ qua padding cho chúng */
const INTERNAL_PADDING_TYPES = new Set([
  "hero",
  "banner-slider",
  "blog-preview",
  "category-grid",
  "contact-cta",
  "custom-html",
  "featured-products",
  "partners",
  "stats-counter",
  "testimonials",
]);

const WRAPPER_ANIMATIONS: Record<string, { initial: TargetAndTransition; whileInView: TargetAndTransition }> = {
  "fade-up": { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 } },
  "fade-in": { initial: { opacity: 0 }, whileInView: { opacity: 1 } },
  "slide-left": { initial: { opacity: 0, x: 60 }, whileInView: { opacity: 1, x: 0 } },
  "zoom-in": { initial: { opacity: 0, scale: 0.94 }, whileInView: { opacity: 1, scale: 1 } },
};

/**
 * Wrapper chung cho mọi section — admin noncode chỉnh được: màu nền, màu tiêu đề,
 * màu chữ, khoảng cách trong/ngoài (px) và hiệu ứng xuất hiện — không cần sửa code.
 */
function SectionShell({ section, children }: { section: Section; children: ReactNode }) {
  const c = section.props as CommonSectionProps;
  const style: CSSProperties & Record<string, string | number> = {};
  if (c.bgColor) style.background = c.bgColor;
  if (c.marginTop != null && c.marginTop !== 0) style.marginTop = `${c.marginTop}px`;
  if (c.marginBottom != null && c.marginBottom !== 0) style.marginBottom = `${c.marginBottom}px`;
  if (!INTERNAL_PADDING_TYPES.has(section.type)) {
    if (c.paddingTop != null && c.paddingTop !== 0) style.paddingTop = `${c.paddingTop}px`;
    if (c.paddingBottom != null && c.paddingBottom !== 0) style.paddingBottom = `${c.paddingBottom}px`;
  }
  if (c.headingColor) style["--sec-heading"] = c.headingColor;
  if (c.textColor) style["--sec-text"] = c.textColor;
  if (c.headingSizeAllPx) style["--sec-heading-size"] = `${c.headingSizeAllPx}px`;
  if (c.textSizePx) style["--sec-text-size"] = `${c.textSizePx}px`;
  // Căn lề chữ cả khối (trái/giữa/phải) — hero tự xử lý flex riêng theo cùng key
  const align = (c as { align?: string }).align;
  if (align && section.type !== "hero") style.textAlign = align as CSSProperties["textAlign"];

  const className = cn(
    "scroll-mt-20",
    c.headingColor && "sec-heading-override",
    c.textColor && "sec-text-override",
    c.headingSizeAllPx && "sec-heading-size-override",
    c.textSizePx && "sec-text-size-override"
  );
  const anim = c.animation && c.animation !== "none" ? WRAPPER_ANIMATIONS[c.animation] : undefined;

  if (!anim) {
    return (
      <div id={`sec-${section.type}`} data-section-id={section.id} className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      id={`sec-${section.type}`}
      data-section-id={section.id}
      suppressHydrationWarning
      className={className}
      style={style}
      initial={anim.initial}
      whileInView={anim.whileInView}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (c.animationDelay ?? 0) / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PageRenderer({ sections }: { sections: Section[] }) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  return (
    <>
      {ordered.map((s) => (
        // data-section-id: Builder dùng để scroll-tới / chọn section từ preview
        <SectionShell key={s.id} section={s}>
          <SectionRenderer section={s} />
        </SectionShell>
      ))}
    </>
  );
}
