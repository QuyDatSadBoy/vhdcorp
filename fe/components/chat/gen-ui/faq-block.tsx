"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Accordion FAQ gen-UI (§9.2) — tự làm bằng framer-motion (không thêm dep),
 * đồng bộ phong cách faq-accordion của site.
 */
export default function FaqBlock({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  if (!items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-2"
    >
      {items.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={i}
            className={cn(
              "overflow-hidden rounded-xl border bg-card transition-colors",
              isOpen ? "border-brand-primary/40 dark:border-brand-accent/40" : "border-border/70 hover:border-border"
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
            >
              <span className="flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                <span className="text-xs font-semibold text-foreground">{item.question}</span>
              </span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="border-t border-border/60 px-3.5 py-2.5 pl-9 text-xs leading-relaxed text-foreground/70">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}
