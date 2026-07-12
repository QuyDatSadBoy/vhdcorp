"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  label: string;
  values: string[];
  /** Hàng nổi bật (khuyến nghị) → tô màu brand */
  highlight?: boolean;
}

interface ComparisonTableProps {
  headers: string[];
  rows: ComparisonRow[];
}

/**
 * Bảng so sánh gen-UI (§9.2): header brand, hàng highlight nổi bật màu brand,
 * cuộn ngang trên mobile.
 */
export default function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  if (!headers?.length || !rows?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-2xl border border-brand-primary/20 bg-card shadow-sm dark:border-border"
    >
      <div className="flex items-center gap-2 bg-linear-to-r from-brand-primary/10 to-brand-accent/10 px-4 py-2.5 dark:from-brand-primary/20 dark:to-brand-accent/15">
        <Scale className="h-4 w-4 text-brand-primary dark:text-brand-accent" aria-hidden />
        <p className="font-heading text-sm font-bold text-foreground">Bảng so sánh</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "border-b border-border px-3 py-2 text-left font-semibold text-foreground",
                    i === 0 && "sticky left-0 bg-muted/50"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={cn(
                  "transition-colors",
                  row.highlight ? "bg-brand-accent/10 dark:bg-brand-accent/15" : "hover:bg-muted/40"
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 border-b border-border/60 px-3 py-2 text-left font-semibold text-foreground",
                    row.highlight ? "bg-brand-accent/10 dark:bg-brand-accent/15" : "bg-card"
                  )}
                >
                  {row.highlight && (
                    <span
                      className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-highlight align-middle"
                      aria-hidden
                    />
                  )}
                  {row.label}
                </th>
                {row.values.map((v, vi) => (
                  <td
                    key={vi}
                    className={cn(
                      "border-b border-border/60 px-3 py-2 align-top text-foreground/80",
                      row.highlight && "font-semibold text-brand-primary dark:text-brand-accent"
                    )}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
