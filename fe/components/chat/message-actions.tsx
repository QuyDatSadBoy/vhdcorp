"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ChatMetrics } from "@/types/chat";
import { cn } from "@/lib/utils";

/**
 * Hàng hành động + số đo dưới câu trả lời.
 *
 * Hình học lấy đúng theo giao diện deepseek-harness (đã mở lên đo trực tiếp): nút tròn
 * 28×28 với glyph 14, khoảng cách 10px, chữ số đo 13px màu dịu, và NÚT ĐỨNG TRƯỚC CHỮ —
 * thứ tự này quan trọng vì tay người dùng tìm nút chép theo vị trí, không theo nhãn.
 *
 * Chữ thì dùng tiếng Việt thay cho "TTFT / tok/s": khách của VHD là người mua vật tư,
 * "chữ đầu sau 1.9s" họ hiểu ngay còn "TTFT" thì không. Số liệu đằng sau vẫn là một.
 */

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Số đo của lượt trả lời.
 *
 * Nhãn viết rõ ("Thời gian chạy", "Token đầu") thay vì gộp thành một dãy số dính nhau —
 * người vận hành đọc để biết nhanh chậm, mà "8.6s · 2.9s · 47" thì phải đoán số nào là gì.
 *
 * Token là số THẬT do nhà cung cấp báo, không phải quy đổi ở trình duyệt. Không có số
 * đó (câu lấy từ bộ đệm, hoặc lịch sử cũ trước khi lưu) thì bỏ hẳn phần token chứ
 * không hiện số ước lượng — thà thiếu hơn là đưa con số không đúng.
 */
function MetricsText({ time, m }: { time: string; m?: ChatMetrics }) {
  if (!m) return <span className="text-[13px] tabular-nums text-muted-foreground/70">{time}</span>;

  if (m.cached) {
    return (
      <span
        className="text-[13px] tabular-nums text-muted-foreground/70"
        title="Câu này có sẵn trong bộ nhớ đệm nên không gọi mô hình — không tốn token"
      >
        {time} · Trả từ bộ đệm {m.total.toFixed(2)}s
      </span>
    );
  }

  const parts = [`Thời gian chạy ${m.total.toFixed(1)}s`];
  // Lịch sử cũ không có mốc "token đầu" (đó là số đo ở trình duyệt lúc chạy) — bỏ hẳn
  // thay vì hiện "Token đầu 0.0s" khiến người đọc tưởng nhanh bất thường.
  if (m.ttft > 0) parts.push(`Token đầu ${m.ttft.toFixed(1)}s`);
  if (m.totalTokens) {
    const speed = m.outTokens && m.total > 0 ? Math.round(m.outTokens / m.total) : 0;
    parts.push(`${m.totalTokens.toLocaleString("vi-VN")} token${speed > 0 ? ` · ${speed} token/s` : ""}`);
  }

  const detail = [
    m.inTokens != null && `vào ${m.inTokens.toLocaleString("vi-VN")} token`,
    m.outTokens != null && `ra ${m.outTokens.toLocaleString("vi-VN")} token`,
    m.model && `model ${m.model}`,
    `${m.chars} ký tự`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="text-[13px] tabular-nums text-muted-foreground/70" title={detail}>
      {time} · {parts.join(" · ")}
    </span>
  );
}

export default function MessageActions({
  text,
  time,
  metrics,
  onRetry,
  speaker,
}: {
  text: string;
  time: string;
  metrics?: ChatMetrics;
  /** Soạn lại câu trả lời — chỉ có ở tin nhắn cuối */
  onRetry?: () => void;
  /** Nút đọc to (truyền từ ngoài để giữ nguyên bộ phát đang chạy) */
  speaker?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Trang chạy trên http hoặc trình duyệt cũ không có clipboard API —
        // thiếu đường lui thì nút bấm im lặng không làm gì.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* trình duyệt chặn — người dùng vẫn bôi đen chép tay được */
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2.5 pl-10">
      <IconButton label={copied ? "Đã chép" : "Chép câu trả lời"} onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </IconButton>

      {speaker}

      <IconButton
        label="Trả lời này hữu ích"
        active={vote === "up"}
        onClick={() => setVote(vote === "up" ? null : "up")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton
        label="Trả lời này chưa đúng"
        active={vote === "down"}
        onClick={() => setVote(vote === "down" ? null : "down")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </IconButton>

      {onRetry && (
        <IconButton label="Soạn lại câu trả lời" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      )}

      <MetricsText time={time} m={metrics} />
    </div>
  );
}
