"use client";

import { useEffect, useRef } from "react";
import type { UiChatMessage } from "@/types/chat";
import MessageBubble from "./message-bubble";
import SuggestedPrompts from "./suggested-prompts";

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
