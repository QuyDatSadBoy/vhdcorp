"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Terminal } from "lucide-react";
import type { ToolRun } from "@/types/chat";

/** Bỏ "Đang " và "…" để nhãn đọc gọn trong 1 dòng log */
function shortLabel(label: string): string {
  return label.replace(/^Đang\s+/, "").replace(/…$/, "");
}

function StateIcon({ state }: { state: ToolRun["state"] }) {
  if (state === "error") {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />;
  }
  if (state === "ok") {
    return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />;
  }
  // Đang chạy: GIỮ icon công cụ — tín hiệu "sống" nằm ở dải sáng lướt qua cả dòng,
  // nên nhiều tool chạy song song màn hình cũng không đầy spinner xoay.
  return <Terminal className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />;
}

function Row({ run }: { run: ToolRun }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(run.input || run.output);
  const summary = run.state === "error" ? "không hoàn thành" : run.output || run.input || "";

  return (
    <li
      data-running={run.state === "running"}
      className={`agent-row-enter rounded-lg ${run.state === "running" ? "agent-row-running bg-brand-accent/5" : ""}`}
    >
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={hasDetail ? open : undefined}
        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
      >
        <StateIcon state={run.state} />
        <span className="shrink-0 font-medium text-foreground">{shortLabel(run.label)}</span>
        {summary && (
          <>
            <span className="shrink-0 text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">{summary}</span>
          </>
        )}
        {hasDetail && (
          <ChevronDown
            className={`ml-auto h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        )}
      </button>

      {open && hasDetail && (
        <div className="space-y-1.5 px-2 pb-2">
          {run.input && <Detail label="Gửi đi" value={run.input} />}
          {run.output && <Detail label="Nhận về" value={run.output} />}
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60">
      <div className="border-b border-border/50 px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <pre className="max-h-32 overflow-auto px-2 py-1.5 font-mono text-[11px] whitespace-pre-wrap break-words text-foreground/80">
        {value}
      </pre>
    </div>
  );
}

/**
 * Log hoạt động của trợ lý: từng lần gọi công cụ, mở ra xem được tham số & kết quả.
 *
 * TỰ MỞ và tự cuộn theo dòng mới trong lúc trợ lý còn chạy (khách thấy việc đang diễn
 * ra thật, không phải một spinner im lặng); tự thu lại thành 1 dòng tóm tắt khi xong.
 * Ai muốn kiểm chứng "AI lấy số này ở đâu" thì mở ra thấy đúng dữ liệu đã tra.
 */
export default function AgentTrace({ runs }: { runs: ToolRun[] }) {
  const running = runs.some((r) => r.state === "running");
  const [open, setOpen] = useState(true);
  const userToggled = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!userToggled.current) setOpen(running);
  }, [running]);

  // Dòng mới nhảy vào thì cuộn theo — log "chạy" như terminal
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [runs, open]);

  if (!runs.length) return null;

  const runningCount = runs.filter((r) => r.state === "running").length;
  const failed = runs.filter((r) => r.state === "error").length;
  const last = runs[runs.length - 1];
  const summary = running
    ? shortLabel(last.label) + (runningCount > 1 ? ` +${runningCount - 1}` : "")
    : failed
      ? `${runs.length} bước · ${failed} lỗi`
      : `${runs.length} bước đã xong`;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left ${running ? "agent-row-running" : ""}`}
      >
        <Terminal className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
        <span className="shrink-0 font-medium text-foreground">
          {running ? "Trợ lý đang tra cứu" : "Trợ lý đã tra cứu"}
        </span>
        <span className="truncate text-muted-foreground">{summary}</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul ref={listRef} className="max-h-56 space-y-0.5 overflow-y-auto border-t border-border/60 p-1.5">
          {runs.map((run) => (
            <Row key={run.id} run={run} />
          ))}
        </ul>
      )}
    </div>
  );
}
