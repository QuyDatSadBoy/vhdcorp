"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ComparisonTableSection } from "@/types/site-config";
import { cn } from "@/lib/utils";

const DEFAULT_COLUMNS = ["Standard", "Premium", "Enterprise B2B"];
const DEFAULT_ROWS: NonNullable<ComparisonTableSection["props"]["rows"]> = [
  { label: "MOQ tối thiểu", values: ["1 sản phẩm", "100 sản phẩm", "1.000 sản phẩm"] },
  { label: "Giảm giá theo khối lượng", values: ["Không", "5-10%", "15-25%"] },
  { label: "Giao hàng nội thành", values: ["3-5 ngày", "24h", "Theo lịch định kỳ"] },
  { label: "Tư vấn kỹ thuật riêng", values: ["", "✓", "✓"], highlight: true },
  { label: "OEM/Private Label", values: ["", "Tùy chọn", "✓ Tích hợp"], highlight: true },
  { label: "Đóng gói chuẩn xuất khẩu", values: ["", "✓", "✓"] },
  { label: "Công nợ 15-30 ngày", values: ["", "", "✓"], highlight: true },
  { label: "Hỗ trợ tài liệu CO/CQ", values: ["", "✓", "✓ Đầy đủ"] },
  { label: "Manager dedicated", values: ["", "", "✓"], highlight: true },
];

function CellValue({ v }: { v: string }) {
  if (v === "✓" || v.startsWith("✓ ")) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-brand-primary">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-primary text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        {v.startsWith("✓ ") ? v.slice(2) : null}
      </span>
    );
  }
  if (!v || v === "Không") {
    return <span className="text-foreground/30">—</span>;
  }
  return <span className="text-foreground/80">{v}</span>;
}

export default function ComparisonTable({ section }: { section: ComparisonTableSection }) {
  const p = section.props;
  const columns = p.columnHeaders?.length ? p.columnHeaders : DEFAULT_COLUMNS;
  const rows = p.rows?.length ? p.rows : DEFAULT_ROWS;

  return (
    <section className="relative bg-(--vhd-color-surface)/40 dark:bg-white/[0.03] py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <p className="type-eyebrow text-brand-primary">{p.eyebrow ?? "So sánh gói dịch vụ"}</p>
          <h2 className="mt-3 type-display-md text-foreground">
            {p.heading ?? "Chọn gói VHD phù hợp với quy mô của bạn"}
          </h2>
          {p.subheading && <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>}
        </motion.div>

        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-[0_18px_60px_-30px_rgba(15,35,86,0.25)]"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-brand-primary/[0.03]">
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.16em] text-foreground/55">
                    Tính năng
                  </th>
                  {columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn(
                        "px-6 py-5 text-sm font-bold tracking-tight",
                        i === columns.length - 1 ? "bg-brand-primary/8 text-brand-primary" : "text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {c}
                        {i === columns.length - 1 && (
                          <span className="rounded-full bg-(--vhd-color-highlight) px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary">
                            Phổ biến
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.label}-${i}`}
                    className={cn(
                      "border-b border-foreground/5 transition-colors hover:bg-brand-primary/[0.03]",
                      r.highlight && "bg-(--vhd-color-highlight)/[0.05]"
                    )}
                  >
                    <td className="px-6 py-4 font-medium text-foreground/85">{r.label}</td>
                    {r.values.map((v, j) => (
                      <td key={j} className={cn("px-6 py-4", j === r.values.length - 1 && "bg-brand-primary/[0.025]")}>
                        <CellValue v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
