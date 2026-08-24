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

/** Số đo: giờ · thời gian chạy · chữ đầu · tốc độ (cùng thứ tự như harness). */
function MetricsText({ time, m }: { time: string; m?: ChatMetrics }) {
  if (!m) return <span className="text-[13px] text-muted-foreground/70 tabular-nums">{time}</span>;
  if (m.cached) {
    return (
      <span
        className="text-[13px] tabular-nums text-muted-foreground/70"
        title="Câu này có sẵn trong bộ nhớ đệm nên không phải gọi mô hình"
      >
        {time} · trả từ bộ đệm · {m.total.toFixed(2)}s
      </span>
    );
  }
  // Ước lượng token: tiếng Việt trung bình ~3.5 ký tự/token với các bộ tách hiện nay.
  // Không có số token thật từ trình duyệt, nên quy đổi rồi ghi rõ là ước lượng.
  const tps = m.total > 0 ? Math.round(m.chars / 3.5 / m.total) : 0;
  return (
    <span
      className="text-[13px] tabular-nums text-muted-foreground/70"
      title={`Chữ đầu sau ${m.ttft.toFixed(2)}s · cả lượt ${m.total.toFixed(2)}s · ${m.chars} ký tự (token là số ước lượng)`}
    >
      {time} · chạy {m.total.toFixed(1)}s · chữ đầu {m.ttft.toFixed(1)}s{tps > 0 ? ` · ${tps} token/s` : ""}
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
