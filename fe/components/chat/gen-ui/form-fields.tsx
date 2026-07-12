"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Class dùng chung cho input/textarea của form gen-UI (đồng bộ brand + dark mode) */
export const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 disabled:opacity-60";

/** Label + control + thông báo lỗi cho một field */
export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-brand-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] font-medium text-brand-danger">{error}</p>}
    </div>
  );
}

/** Khung form gen-UI: header icon + tiêu đề + nội dung */
export function FormShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-primary/20 bg-card shadow-sm dark:border-border">
      <div className="flex items-center gap-2.5 bg-linear-to-r from-brand-primary/10 to-brand-accent/10 px-4 py-3 dark:from-brand-primary/20 dark:to-brand-accent/15">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand-primary to-brand-accent text-white shadow-sm">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-bold text-foreground">{title}</p>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Trạng thái "Đã gửi ✓" hiển thị thay form sau khi submit thành công */
export function SubmittedCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
        {title}
      </p>
      <div className="mt-2 space-y-0.5 pl-7 text-xs text-foreground/70">
        {lines.map((l, i) => (
          <p key={i} className={cn(l.startsWith("—") && "text-muted-foreground/70")}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
