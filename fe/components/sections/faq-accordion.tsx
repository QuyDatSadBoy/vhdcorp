"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import type { FaqAccordionSection } from "@/types/site-config";
import { cn } from "@/lib/utils";

const DEFAULT_ITEMS: NonNullable<FaqAccordionSection["props"]["items"]> = [
  {
    question: "Đơn hàng tối thiểu là bao nhiêu?",
    answer:
      "VHD Corp nhận đơn hàng từ 1 sản phẩm cho khách lẻ và từ 100 sản phẩm cho khách B2B. Với đơn hàng B2B trên 5 triệu VNĐ, chúng tôi miễn phí giao hàng nội thành.",
  },
  {
    question: "Có hỗ trợ sản xuất OEM/Private Label không?",
    answer:
      "Có. Chúng tôi nhận sản xuất theo thương hiệu khách hàng — in logo bao bì, custom kích thước, đóng gói chuẩn xuất khẩu. MOQ tùy sản phẩm, từ 500 đơn vị.",
  },
  {
    question: "Thời gian giao hàng bao lâu?",
    answer:
      "Hàng có sẵn trong kho: 24h nội thành TP.HCM, 2-3 ngày các tỉnh thành. Hàng đặt sản xuất theo yêu cầu: 7-15 ngày tùy độ phức tạp và số lượng.",
  },
  {
    question: "VHD Corp có chứng nhận chất lượng nào?",
    answer:
      "Sản phẩm của VHD đạt chuẩn ISO 9001 cho hệ thống quản lý chất lượng, TCVN cho ống nhựa & cao su, HACCP cho thực phẩm làng nghề. Chứng nhận đầy đủ giấy tờ truy xuất nguồn gốc.",
  },
  {
    question: "Thanh toán theo công nợ được không?",
    answer:
      "Khách hàng B2B có hợp đồng dài hạn được hỗ trợ công nợ 15-30 ngày tùy đánh giá tín dụng. Chấp nhận chuyển khoản, thanh toán quốc tế qua T/T, L/C.",
  },
  {
    question: "Có hỗ trợ xuất khẩu không?",
    answer:
      "Có. VHD Corp đã xuất khẩu sang 28 quốc gia. Hỗ trợ đầy đủ thủ tục hải quan, CO/CQ, packing list, đóng container chuẩn xuất khẩu.",
  },
];

function FaqRow({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card transition-colors",
        isOpen
          ? "border-(--vhd-color-primary)/40 shadow-[0_8px_24px_-16px_rgba(15,35,86,0.2)]"
          : "border-foreground/8 hover:border-foreground/15"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
      >
        <span className="flex items-start gap-4">
          <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-[11px] font-bold tabular-nums text-brand-primary">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-heading text-base font-bold text-foreground sm:text-lg">{item.question}</span>
        </span>
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all",
            isOpen ? "bg-brand-primary text-white" : "bg-foreground/5 text-foreground/60"
          )}
        >
          {isOpen ? <Minus className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            suppressHydrationWarning
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-foreground/8 px-6 py-5 pl-[3.6rem] text-sm leading-relaxed text-foreground/70">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqAccordion({ section }: { section: FaqAccordionSection }) {
  const p = section.props;
  const items = p.items?.length ? p.items : DEFAULT_ITEMS;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="relative py-24">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 max-w-2xl"
        >
          <p className="type-eyebrow text-brand-accent">{p.eyebrow ?? "Câu hỏi thường gặp"}</p>
          <h2 className="mt-3 type-display-md text-foreground">{p.heading ?? "Mọi điều bạn cần biết về VHD Corp"}</h2>
          {p.subheading && <p className="mt-4 type-lead text-foreground/65">{p.subheading}</p>}
        </motion.div>

        <div className="space-y-3">
          {items.map((it, i) => (
            <FaqRow
              key={`${it.question}-${i}`}
              item={it}
              index={i}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
