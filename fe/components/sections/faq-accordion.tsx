"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import type { FaqAccordionSection } from "@/types/site-config";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/json-ld";

export const DEFAULT_FAQ_ITEMS: NonNullable<FaqAccordionSection["props"]["items"]> = [
  {
    question: "VHD Corp cung cấp những sản phẩm gì?",
    answer:
      "Chúng tôi cung cấp sỉ vật tư ngành điện lạnh và cơ điện (gas lạnh, ống đồng, xốp bảo ôn, băng dính, dây điện, gioăng cao su…), đồng thời sản xuất khuôn mẫu và đúc nhựa. Danh mục được cập nhật thường xuyên trên website.",
  },
  {
    question: "Đơn hàng tối thiểu là bao nhiêu?",
    answer:
      "VHD Corp nhận cả đơn lẻ cho khách cá nhân và đơn số lượng lớn cho doanh nghiệp. Bạn cứ liên hệ để được tư vấn số lượng và mức giá phù hợp.",
  },
  {
    question: "Đặt hàng và thanh toán như thế nào?",
    answer:
      "Bạn thêm sản phẩm vào giỏ rồi gửi yêu cầu đặt hàng trên website. Đội ngũ VHD sẽ liên hệ xác nhận đơn, phương thức thanh toán và giao hàng.",
  },
  {
    question: "Thời gian giao hàng bao lâu?",
    answer:
      "Với hàng có sẵn, chúng tôi giao trong vài ngày làm việc tùy khu vực. Thời gian cụ thể sẽ được xác nhận khi bạn đặt hàng.",
  },
  {
    question: "Có hỗ trợ khách doanh nghiệp (B2B) không?",
    answer: "Có. Chúng tôi hỗ trợ báo giá theo số lượng, xuất hóa đơn và tư vấn riêng cho các đơn hàng doanh nghiệp.",
  },
  {
    question: "Làm sao để được tư vấn?",
    answer:
      "Bạn có thể gọi hotline, nhắn tin qua các kênh liên hệ hoặc dùng trợ lý AI ngay trên website — chúng tôi luôn sẵn sàng hỗ trợ.",
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
  const items = p.items?.length ? p.items : DEFAULT_FAQ_ITEMS;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  // FAQPage schema — hiện FAQ rich result trên Google + để AI answer engine trích dẫn.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };

  return (
    <section className="relative py-24">
      <JsonLd id="faq" data={faqLd} />
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div
          suppressHydrationWarning
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 max-w-2xl"
        >
          <p className="type-eyebrow text-brand-primary">{p.eyebrow ?? "Câu hỏi thường gặp"}</p>
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
