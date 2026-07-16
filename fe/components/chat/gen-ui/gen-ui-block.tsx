"use client";

import type { ChatProduct } from "@/types/chat";
import ComparisonTable from "./comparison-table";
import ContactForm from "./contact-form";
import FaqBlock from "./faq-block";
import ImageSearchResult from "./image-search-result";
import AddToCartAction from "./add-to-cart-action";
import PostList, { type ChatPost } from "./post-list";
import CategoryList, { type ChatCategory } from "./category-list";
import ProductCarousel from "./product-carousel";
import QuoteRequest from "./quote-request";

interface GenUiBlockProps {
  component: string;
  props: Record<string, unknown>;
  /** Form gen-UI submit → gửi câu lệnh tự nhiên trở lại agent (HITL) */
  onAction: (message: string) => void;
}

/**
 * Renderer generative-UI (§9.2): map tên component (kebab-case do BE emit)
 * → component React tương ứng. Component lạ → không render (an toàn stream).
 */
export default function GenUiBlock({ component, props, onAction }: GenUiBlockProps) {
  switch (component) {
    case "product-carousel":
      return <ProductCarousel products={(props.products as ChatProduct[]) ?? []} />;

    case "contact-form":
      return <ContactForm prefill={props.prefill as Record<string, string> | undefined} onAction={onAction} />;

    case "quote-request":
      return (
        <QuoteRequest
          product={props.product as string | undefined}
          products={(props.products as ChatProduct[]) ?? []}
          onAction={onAction}
        />
      );

    case "comparison-table":
      return (
        <ComparisonTable
          headers={(props.headers as string[]) ?? []}
          rows={(props.rows as { label: string; values: string[]; highlight?: boolean }[]) ?? []}
        />
      );

    case "faq":
      return <FaqBlock items={(props.items as { question: string; answer: string }[]) ?? []} />;

    case "add-to-cart":
      return (
        <AddToCartAction
          product={props.product as ChatProduct & { id?: number }}
          qty={(props.qty as number) ?? 1}
          actionId={(props.action_id as string) ?? ""}
        />
      );

    case "post-list":
      return <PostList posts={(props.posts as ChatPost[]) ?? []} />;

    case "category-list":
      return <CategoryList categories={(props.categories as ChatCategory[]) ?? []} />;

    case "image-search-result":
      return (
        <ImageSearchResult query={(props.query as string) ?? ""} products={(props.products as ChatProduct[]) ?? []} />
      );

    default:
      return null;
  }
}
