"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import type { TodoItem } from "@/types/chat";

/** Vòng tròn trạng thái 14×14 — xong / đang làm (quay) / chờ (nét đứt) */
function StatusGlyph({ status }: { status: TodoItem["status"] }) {
  if (status === "completed") {
    return (
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.2 7.2l2 2 3.6-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg
        viewBox="0 0 14 14"
        className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-accent motion-reduce:animate-none"
        aria-hidden
      >
        <circle
          cx="7"
          cy="7"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="18 10"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.4 2.4" />
    </svg>
  );
}

function progressLabel(items: TodoItem[]): string {
  const done = items.filter((i) => i.status === "completed").length;
  const active = items.filter((i) => i.status === "in_progress").length;
  const pending = items.length - done - active;
  return [done && `${done} xong`, active && `${active} đang làm`, pending && `${pending} chờ`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Bảng kế hoạch trợ lý tự lập cho yêu cầu nhiều bước (DeepAgents `write_todos`).
 *
 * TỰ MỞ khi còn việc đang chạy — khách thấy ngay trợ lý đang làm tới bước nào mà
 * không phải bấm; tự thu lại khi xong hết để không chiếm chỗ. Khách bấm tay thì
 * tôn trọng lựa chọn đó, không tự động đóng/mở nữa.
 */
export default function AgentPlan({ items }: { items: TodoItem[] }) {
  const running = items.some((i) => i.status !== "completed");
  const [open, setOpen] = useState(true);
  const userToggled = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!userToggled.current) setOpen(running);
  }, [running]);

  // Việc đang làm luôn trong tầm mắt khi danh sách dài hơn khung
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [items, open]);

  if (!items.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left ${running ? "agent-row-running" : ""}`}
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
        <span className="shrink-0 font-medium text-foreground">
          {running ? "Trợ lý đang làm theo kế hoạch" : "Đã hoàn thành kế hoạch"}
        </span>
        <span className="truncate text-muted-foreground">{progressLabel(items)}</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul ref={listRef} className="max-h-44 space-y-1.5 overflow-y-auto border-t border-border/60 px-3 py-2">
          {items.map((item, i) => (
            <li
              key={`${i}-${item.content}`}
              data-active={item.status === "in_progress"}
              className="agent-row-enter flex items-start gap-2"
            >
              <span className="pt-0.5">
                <StatusGlyph status={item.status} />
              </span>
              {/* Việc xong KHÔNG gạch ngang: chữ giữ nguyên, chỉ đổi vòng trạng thái.
                  Gạch ngang cả danh sách làm khung kế hoạch trông như bị bỏ đi. */}
              <span className={item.status === "in_progress" ? "font-medium text-foreground" : "text-muted-foreground"}>
                {item.content}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
