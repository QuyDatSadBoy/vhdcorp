"use client";

import { Sparkles, Search, ImagePlus, Mic, ShoppingCart, BadgePercent, Headphones } from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";

/** Câu hỏi mẫu mặc định — admin thay trong Cài đặt site → Brand → Trợ lý AI */
const PROMPTS = [
  "Cho tôi xem vật tư điện lạnh",
  "Tư vấn gas lạnh và ống đồng",
  "Câu hỏi thường gặp",
  "Tôi muốn để lại thông tin liên hệ",
];

/** Năng lực của trợ lý — cho khách biết có thể giao việc gì */
const CAPABILITIES = [
  { icon: Search, label: "Tìm & so sánh sản phẩm" },
  { icon: ImagePlus, label: "Gửi ảnh để tìm hàng giống" },
  { icon: ShoppingCart, label: "Thêm vào giỏ, đặt hàng" },
  { icon: BadgePercent, label: "Kiểm tra giá & khuyến mãi" },
  { icon: Headphones, label: "Tư vấn kỹ thuật, quy cách" },
  { icon: Mic, label: "Nói chuyện bằng giọng nói" },
];

/**
 * Empty state của khung chat: lời chào + các chip câu hỏi gợi ý.
 * Click chip → gửi luôn câu hỏi đó.
 */
export default function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const chatCfg = useSiteConfigStore((st) => st.config?.chat);
  const prompts = chatCfg?.suggestedPrompts?.length ? chatCfg.suggestedPrompts : PROMPTS;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-brand-primary to-brand-accent shadow-lg">
        <Sparkles className="h-7 w-7 text-white" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-lg font-bold text-foreground">
          {chatCfg?.greeting || "Xin chào! Tôi là trợ lý AI của VHD"}
        </p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {chatCfg?.subGreeting ||
            "Hỏi tôi về sản phẩm, giá cả, tư vấn kỹ thuật hoặc để lại thông tin liên hệ — tôi trả lời ngay."}
        </p>
      </div>
      {/* Bảng năng lực — khách biết trợ lý làm được gì để giao việc */}
      <div className="grid w-full max-w-md grid-cols-2 gap-1.5 text-left">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
            <span className="text-[11px] font-medium text-foreground/75">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-brand-primary/25 bg-brand-primary/5 px-3.5 py-2 text-xs font-medium text-brand-primary transition-colors hover:border-brand-accent hover:bg-brand-accent/10 dark:border-border dark:bg-muted/60 dark:text-foreground dark:hover:border-brand-accent"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
