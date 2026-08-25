"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Terminal } from "lucide-react";
import type { ToolRun } from "@/types/chat";

/**
 * Log hoạt động của trợ lý — hình học và nhịp điệu học từ giao diện deepseek-harness
 * (đã chạy thật để đo): dòng cao 24px, ô icon 16px chứa glyph 14px, tiêu đề không bao
 * giờ bị cắt, phần tóm tắt co giãn và cắt bằng dấu ba chấm, trạng thái đặt trên
 * `data-state` để CSS tự bật hiệu ứng.
 */

/** Bỏ "Đang " và "…" để nhãn đọc gọn trong một dòng */
function shortLabel(label: string): string {
  return label.replace(/^Đang\s+/, "").replace(/…$/, "");
}

/** Ô 16×16: icon công cụ và mũi chevron ĐÈ LÊN NHAU rồi cross-fade khi trỏ chuột —
 *  chevron không chiếm chỗ nên dòng không nhảy 1px lúc hiện ra. */
function LeadingGlyph({ state, expandable }: { state: ToolRun["state"]; expandable: boolean }) {
  const Icon = state === "error" ? AlertCircle : Terminal;
  const tone = state === "error" ? "text-destructive" : state === "ok" ? "text-muted-foreground" : "text-brand-accent";
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <Icon
        className={`h-3.5 w-3.5 transition-opacity duration-100 ${tone} ${expandable ? "group-hover:opacity-0" : ""}`}
        aria-hidden
      />
      {expandable && (
        <ChevronDown
          className="absolute inset-0 m-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      )}
    </span>
  );
}

/** Dấu phân cách là một ô vuông 2×2px, KHÔNG phải ký tự "·" — nhờ vậy màu và kích
 *  thước điều khiển được, và không lệ thuộc font hiển thị dấu giữa dòng thế nào. */
function Separator() {
  return <span className="h-0.5 w-0.5 shrink-0 rounded-[1px] bg-muted-foreground/50" aria-hidden />;
}

function Row({ run }: { run: ToolRun }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(run.input || run.output);
  const summary = run.state === "error" ? "không hoàn thành" : run.output || run.input || "";

  return (
    <li
      data-state={run.state}
      className={`agent-row-enter group rounded-md ${run.state === "running" ? "agent-row-running" : ""}`}
    >
      <div
        role={hasDetail ? "button" : undefined}
        tabIndex={hasDetail ? 0 : undefined}
        aria-expanded={hasDetail ? open : undefined}
        onClick={() => hasDetail && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (hasDetail && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`flex h-6 items-center px-1.5 ${hasDetail ? "cursor-pointer" : ""}`}
      >
        <span className="mr-1.5 inline-flex">
          <LeadingGlyph state={run.state} expandable={hasDetail} />
        </span>
        {/* Tiêu đề flex-none: dù dòng hẹp đến đâu cũng không bị cắt mất tên việc */}
        <span className="shrink-0 text-[13px] text-foreground/80">{shortLabel(run.label)}</span>
        {summary && (
          <>
            <span className="mx-2 inline-flex">
              <Separator />
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{summary}</span>
          </>
        )}
        {run.state === "error" && <span className="sr-only">Thất bại</span>}
      </div>

      {open && hasDetail && (
        <div className="space-y-1.5 px-1.5 pb-2">
          {run.input && <Detail label="Gửi đi" value={run.input} />}
          {run.output && <Detail label="Nhận về" value={run.output} />}
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-border/60 bg-background/60 p-1.5">
      {/* Nhãn dán trên khi nội dung cuộn — và dịu hơn một bậc so với nội dung để nó
          đọc như nhãn chứ không như dữ liệu */}
      <span className="sticky top-0 shrink-0 self-start text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
        {label}
      </span>
      <pre className="max-h-[150px] min-w-0 flex-1 overflow-auto font-mono text-[11px] whitespace-pre-wrap break-words text-foreground/80">
        {value}
      </pre>
    </div>
  );
}

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
    ? shortLabel(last.label)
    : failed
      ? `${runs.length} bước · ${failed} lỗi`
      : `${runs.length} bước đã xong`;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
      <button
        type="button"
        onClick={() => {
          userToggled.current = true;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center px-3 py-2 text-left ${running ? "agent-row-running" : ""}`}
      >
        <Terminal className="mr-1.5 h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
        <span className="shrink-0 text-[13px] font-medium text-foreground">
          {running ? "Trợ lý đang tra cứu" : "Trợ lý đã tra cứu"}
        </span>
        <span className="mx-2 inline-flex">
          <Separator />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
        {/* Đếm số việc song song đặt NGOÀI vùng bị cắt: nó chỉ có giá trị khi dòng hẹp */}
        {runningCount > 1 && (
          <span className="ml-1 shrink-0 text-xs whitespace-nowrap tabular-nums text-muted-foreground">
            +{runningCount - 1}
          </span>
        )}
        <ChevronDown
          className={`ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul ref={listRef} className="max-h-[180px] overflow-y-auto border-t border-border/60 p-1">
          {runs.map((run) => (
            <Row key={run.id} run={run} />
          ))}
        </ul>
      )}
    </div>
  );
}
