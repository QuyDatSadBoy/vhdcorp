"use client";

import { Sparkles } from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";

/** Câu hỏi mẫu mặc định — admin thay trong Cài đặt site → Brand → Trợ lý AI */
const PROMPTS = [
  "Cho tôi xem vật tư điện lạnh",
  "Tư vấn gas lạnh và ống đồng",
  "Câu hỏi thường gặp",
  "Tôi muốn để lại thông tin liên hệ",
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
