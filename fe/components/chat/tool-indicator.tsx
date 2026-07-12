"use client";

import { Loader2 } from "lucide-react";

/** Map tên tool của agent → nhãn tiếng Việt hiển thị khi tool đang chạy */
const TOOL_LABELS: Record<string, string> = {
  search_products: "Đang tìm kiếm sản phẩm…",
  get_product_detail: "Đang xem chi tiết sản phẩm…",
  web_search: "Đang tìm trên web…",
  send_contact_request: "Đang gửi liên hệ…",
  // Gen-UI render tools (§9.2)
  show_product_carousel: "Đang chuẩn bị sản phẩm…",
  show_contact_form: "Đang mở form liên hệ…",
  show_quote_request: "Đang mở form báo giá…",
  show_comparison_table: "Đang lập bảng so sánh…",
  show_faq: "Đang tổng hợp câu hỏi thường gặp…",
  create_quote: "Đang tạo yêu cầu báo giá…",
};

/** Chip nhỏ + spinner báo agent đang gọi công cụ (tool.start → tool.end) */
export default function ToolIndicator({ name }: { name: string }) {
  const label = TOOL_LABELS[name] ?? "Đang xử lý…";
  return (
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-primary dark:text-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-accent" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
