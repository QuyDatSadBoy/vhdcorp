"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Send } from "lucide-react";

/**
 * Trợ lý hỏi lại khách bằng các lựa chọn BẤM ĐƯỢC (§9.2).
 *
 * Vì sao cần: hàng cơ điện/cao su luôn thiếu một thông tin bắt buộc (chất liệu, quy
 * cách, số lượng). Bắt khách tự gõ thì nhiều người bỏ giữa đường; đưa 2–5 nút bấm
 * thì trả lời xong trong một cú chạm. Bấm nút = gửi câu trả lời đó lại cho trợ lý.
 */
export default function UserQuestion({
  question,
  options,
  allowOther = true,
  onAction,
}: {
  question: string;
  options: string[];
  allowOther?: boolean;
  onAction: (message: string) => void;
}) {
  const [answered, setAnswered] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [showOther, setShowOther] = useState(false);

  if (!question || !options?.length) return null;

  const pick = (value: string) => {
    const v = value.trim();
    if (!v || answered) return;
    setAnswered(v);
    onAction(v);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-brand-accent/40 bg-brand-accent/5 p-3"
    >
      <p className="flex items-start gap-2 text-xs font-semibold text-foreground">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
        {question}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const chosen = answered === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={Boolean(answered)}
              onClick={() => pick(opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                chosen
                  ? "border-brand-primary bg-brand-primary text-white"
                  : answered
                    ? "border-border/60 text-muted-foreground/60"
                    : "cursor-pointer border-border/70 bg-background text-foreground hover:border-brand-accent hover:bg-brand-accent/10"
              }`}
            >
              {opt}
            </button>
          );
        })}

        {allowOther && !answered && !showOther && (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="cursor-pointer rounded-full border border-dashed border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand-accent hover:text-foreground"
          >
            Khác…
          </button>
        )}
      </div>

      {showOther && !answered && (
        <div className="mt-2 flex gap-1.5">
          <input
            autoFocus
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") pick(other);
            }}
            placeholder="Bạn nhập giúp mình…"
            aria-label="Câu trả lời khác"
            className="min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs outline-none focus:border-brand-accent"
          />
          <button
            type="button"
            onClick={() => pick(other)}
            disabled={!other.trim()}
            aria-label="Gửi câu trả lời"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-brand-primary text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      {answered && <p className="mt-2 text-[11px] text-muted-foreground">Đã chọn: {answered}</p>}
    </motion.div>
  );
}
