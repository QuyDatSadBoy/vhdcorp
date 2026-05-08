"use client";

import type { Section } from "@/types/site-config";
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
    default:
      return null;
  }
}

export function PageRenderer({ sections }: { sections: Section[] }) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  return (
    <>
      {ordered.map((s) => (
        <div key={s.id} id={`sec-${s.type}`} className="scroll-mt-20">
          <SectionRenderer section={s} />
        </div>
      ))}
    </>
  );
}
