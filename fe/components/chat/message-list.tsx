"use client";

import { useEffect, useRef } from "react";
import type { UiChatMessage } from "@/types/chat";
import MessageBubble from "./message-bubble";
import SuggestedPrompts from "./suggested-prompts";

/** Gợi ý câu hỏi tiếp theo theo ngữ cảnh câu trả lời cuối (heuristic theo gen-UI vừa render). */
function followupsFor(last: UiChatMessage | undefined): string[] {
  if (!last || last.role !== "assistant" || last.streaming || last.error) return [];
  const kinds = new Set((last.uiBlocks ?? []).map((b) => b.component));
  if (kinds.has("add-to-cart")) return ["Xem thêm sản phẩm tương tự", "Áp mã giảm giá thế nào?", "Đặt hàng ngay"];
  if (kinds.has("product-carousel") || kinds.has("image-search-result"))
    return ["So sánh các sản phẩm này", "Thêm sản phẩm đầu tiên vào giỏ", "Có khuyến mãi gì không?"];
  if (kinds.has("post-list")) return ["Có bài nào về làng nghề không?", "Cho mình xem sản phẩm nổi bật"];
  if (kinds.has("category-list")) return ["Xem sản phẩm nhựa & cao su", "Sản phẩm nào đang khuyến mãi?"];
  if (kinds.has("comparison-table")) return ["Thêm sản phẩm rẻ hơn vào giỏ", "Tư vấn giúp mình lựa chọn"];
  return [];
}

interface MessageListProps {
  messages: UiChatMessage[];
  loading: boolean;
  activeTool: string | null;
  onRetry: () => void;
  onSelectPrompt: (prompt: string) => void;
  /** Form gen-UI submit → gửi câu lệnh trở lại agent */
  onAction: (message: string) => void;
}

/**
 * Vùng cuộn tin nhắn: auto-scroll xuống đáy khi stream — nhưng nếu user
 * đang cuộn lên đọc lại thì KHÔNG kéo xuống (check khoảng cách tới đáy).
 */
export default function MessageList({
  messages,
  loading,
  activeTool,
  onRetry,
  onSelectPrompt,
  onAction,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  /** true = đang "dính" đáy → được phép auto-scroll */
  const stickToBottomRef = useRef(true);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Mỗi khi nội dung đổi (delta mới / tool indicator) → cuộn đáy nếu đang dính đáy
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, activeTool, loading]);

  if (!loading && messages.length === 0) {
    return <SuggestedPrompts onSelect={onSelectPrompt} />;
  }

  const lastIndex = messages.length - 1;

  return (
    <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
      {loading ? (
        // Skeleton khi nạp lịch sử hội thoại
        <div className="space-y-4" aria-label="Đang tải hội thoại">
          <div className="h-10 w-3/5 animate-pulse rounded-2xl bg-muted" />
          <div className="ml-auto h-10 w-2/5 animate-pulse rounded-2xl bg-muted" />
          <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              // Chỉ bubble cuối (đang stream) mới nhận tool indicator
              activeTool={i === lastIndex ? activeTool : null}
              onRetry={message.error ? onRetry : undefined}
              onAction={onAction}
              isLast={i === lastIndex}
            />
          ))}
          {/* Gợi ý câu hỏi tiếp theo — bấm là hỏi luôn */}
          {followupsFor(messages[lastIndex]).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-10">
              {followupsFor(messages[lastIndex]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onSelectPrompt(f)}
                  className="rounded-full border border-brand-primary/25 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-brand-primary transition hover:bg-brand-primary hover:text-white"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
