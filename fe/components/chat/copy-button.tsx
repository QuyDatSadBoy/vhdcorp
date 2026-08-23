"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chép câu trả lời ra bộ nhớ tạm.
 *
 * Có đường lui cho trang chạy trên http hoặc trình duyệt cũ: navigator.clipboard chỉ
 * tồn tại ở ngữ cảnh bảo mật, thiếu nó mà không dự phòng thì nút bấm im lặng không làm gì.
 */
export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* trình duyệt chặn — không báo lỗi ồn ào, người dùng bôi đen chép tay được */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Đã chép" : "Chép câu trả lời"}
      title={copied ? "Đã chép" : "Chép"}
      className={cn(
        "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
