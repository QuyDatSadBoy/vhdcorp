"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Khối mã có thanh tiêu đề và nút chép — như ChatGPT và deepseek-harness.
 *
 * Mã trần không nút chép thì người dùng phải bôi đen bằng tay, mà bôi đen trong khung
 * chat hẹp rất dễ trượt sang chữ xung quanh. Thanh tiêu đề cũng cho biết đây là ngôn
 * ngữ gì thay vì một khối xám vô danh.
 */
export default function CodeBlock({ language, code }: { language: string | null; code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* trình duyệt chặn — vẫn bôi đen chép tay được */
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border/70">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/60 px-2.5 py-1">
        <span className="font-mono text-[11px] font-medium text-muted-foreground">{language || "mã"}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Đã chép" : "Chép đoạn mã"}
          title={copied ? "Đã chép" : "Chép"}
          className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* Mã dài phải cuộn TRONG khối, không được đẩy cả khung chat rộng ra.
          Màu chữ phải đặt TƯỜNG MINH: lớp `prose` của Tailwind gán cho thẻ code một
          màu dành cho nền tối, đặt lên nền sáng của khối này thì chữ mờ tới mức không
          đọc được. */}
      <pre className="m-0 overflow-x-auto bg-card p-2.5 text-[12px] leading-relaxed !text-foreground">
        <code className="font-mono !text-foreground">{code}</code>
      </pre>
    </div>
  );
}
