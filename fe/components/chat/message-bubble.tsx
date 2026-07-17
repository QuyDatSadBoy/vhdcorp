"use client";

import { memo } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useVoiceChatStore } from "@/store/voice-chat.store";
import type { UiChatMessage } from "@/types/chat";
import GenUiBlock from "./gen-ui/gen-ui-block";
import MarkdownContent from "./markdown-content";
import ToolIndicator from "./tool-indicator";
import TtsButton from "./tts-button";

/** Giờ:phút vi-VN cho timestamp mờ dưới bubble */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** 3 chấm nhún khi chờ token đầu tiên */
function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Đang soạn trả lời">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

interface MessageBubbleProps {
  message: UiChatMessage;
  /** Tool đang chạy — chỉ truyền cho bubble assistant cuối cùng đang stream */
  activeTool?: string | null;
  onRetry?: () => void;
  /** Form gen-UI submit → gửi câu lệnh trở lại agent */
  onAction?: (message: string) => void;
  /** Bubble assistant mới nhất → prefetch TTS ngay khi trả lời xong (bấm loa phát tức thì) */
  isLast?: boolean;
}

/** Một dòng tin nhắn: user phải (nền brand), assistant trái (avatar VHD + markdown) */
function MessageBubble({ message, activeTool, onRetry, onAction, isLast = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  // Voice mode: câu trả lời mới nhất tự đọc to (voice-to-voice)
  const voiceOn = useVoiceChatStore((s) => s.enabled);

  if (isUser) {
    return (
      <div className="flex flex-col items-end">
        {/* Ảnh khách đính kèm (image search) */}
        {message.image && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL ảnh tạm, không cần optimize
          <img
            src={message.image}
            alt="Ảnh đã gửi"
            className="mb-1.5 max-h-40 max-w-[70%] rounded-2xl rounded-br-md border border-border/60 object-cover shadow-sm"
          />
        )}
        {message.content && (
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-linear-to-br from-brand-primary to-brand-accent px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-sm">
            {message.content}
          </div>
        )}
        <span className="mt-1 pr-1 text-[10px] text-muted-foreground/70">{formatTime(message.createdAt)}</span>
      </div>
    );
  }

  // Bubble lỗi: nền đỏ nhẹ + nút thử lại
  if (message.error) {
    return (
      <div className="flex items-start gap-2.5">
        <AssistantAvatar />
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {message.error}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const waitingFirstToken = message.streaming && !message.content && !message.uiBlocks?.length;
  const hasBlocks = Boolean(message.uiBlocks?.length);

  return (
    <div className="flex flex-col items-start">
      <div className="flex w-full max-w-full items-start gap-2.5">
        <AssistantAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          {/* Bong bóng chữ (chỉ hiện khi có nội dung hoặc đang chờ token) */}
          {(message.content || waitingFirstToken) && (
            <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-md border border-border/60 bg-muted/50 px-3.5 py-2.5 text-sm text-foreground">
              {waitingFirstToken ? (
                activeTool ? (
                  <ToolIndicator name={activeTool} />
                ) : (
                  <TypingDots />
                )
              ) : (
                <>
                  <MarkdownContent content={message.content} />
                  {message.streaming && activeTool && (
                    <div className="mt-2">
                      <ToolIndicator name={activeTool} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tool indicator khi đã có block nhưng chưa có chữ */}
          {!message.content && hasBlocks && message.streaming && activeTool && <ToolIndicator name={activeTool} />}

          {/* Generative-UI blocks (carousel/form/table/faq…) */}
          {hasBlocks && (
            <div className="space-y-3">
              {message.uiBlocks!.map((block) => (
                <GenUiBlock
                  key={block.id}
                  component={block.component}
                  props={block.props}
                  onAction={onAction ?? (() => {})}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta: timestamp + nút đọc to (chỉ khi có nội dung, đã stream xong) */}
      {!message.streaming && message.content && (
        <div className="mt-1 flex items-center gap-1.5 pl-10">
          <span className="text-[10px] text-muted-foreground/70">{formatTime(message.createdAt)}</span>
          <TtsButton
            text={message.content}
            eager={isLast && message.role === "assistant"}
            autoPlay={voiceOn && isLast && message.role === "assistant" && Boolean(message.finishedLive)}
          />
        </div>
      )}
    </div>
  );
}

// memo: đang stream chỉ bubble cuối đổi props — các bubble cũ không re-render
export default memo(MessageBubble);

/** Avatar logo VHD cho assistant */
function AssistantAvatar() {
  return (
    <span
      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand-primary to-brand-accent text-[8px] font-bold text-white shadow-sm"
      aria-hidden
    >
      VHD
    </span>
  );
}
