"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, TriangleAlert, X } from "lucide-react";
import { useUpdateProduct } from "@/services/product.service";
import type { AssistantProposal } from "@/services/ai.service";
import { Button } from "@/components/ui/button";

/** Nhãn tiếng Việt cho từng trường được phép sửa (khớp danh sách bên agent). */
const FIELD_LABELS: Record<string, string> = {
  price: "Giá bán",
  stock: "Tồn kho",
  status: "Trạng thái",
  description: "Mô tả",
  metaTitle: "Tiêu đề SEO",
  metaDesc: "Mô tả SEO",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang bán",
  ARCHIVED: "Đã lưu trữ",
};

function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "(trống)";
  if (field === "price") return typeof value === "number" ? `${value.toLocaleString("vi-VN")} ₫` : String(value);
  if (field === "status") return STATUS_LABELS[String(value)] ?? String(value);
  const text = String(value);
  return text.length > 120 ? text.slice(0, 120) + "…" : text;
}

/**
 * Trợ lý đề xuất sửa dữ liệu — admin đọc rồi quyết.
 *
 * Việc ghi do CHÍNH admin thực hiện (dùng phiên đăng nhập của họ), trợ lý không có
 * quyền ghi. Một câu hiểu nhầm của mô hình cũng không thể tự đổi giá hàng loạt.
 */
export default function ProposalCard({ proposal }: { proposal: AssistantProposal }) {
  const update = useUpdateProduct();
  const [done, setDone] = useState<"applied" | "rejected" | null>(null);

  const fields = Object.keys(proposal.changes);

  const apply = async () => {
    if (!proposal.productId) {
      toast.error("Đề xuất thiếu mã sản phẩm — mở trang sản phẩm sửa tay giúp mình.");
      return;
    }
    try {
      await update.mutateAsync({ id: proposal.productId, payload: proposal.changes as never });
      setDone("applied");
      toast.success(`Đã cập nhật "${proposal.productName}".`);
    } catch {
      toast.error("Không lưu được thay đổi, thử lại.");
    }
  };

  return (
    <div className="rounded-xl border border-amber-400/50 bg-amber-50/60 p-3 dark:bg-amber-500/5">
      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Trợ lý đề xuất sửa — cần bạn duyệt
      </p>

      <p className="mt-1.5 text-sm font-semibold">{proposal.productName}</p>
      {proposal.reason && <p className="mt-0.5 text-xs text-muted-foreground">{proposal.reason}</p>}

      <ul className="mt-2 space-y-1">
        {fields.map((f) => (
          <li key={f} className="flex flex-wrap items-baseline gap-1.5 text-xs">
            <span className="font-medium text-foreground/80">{FIELD_LABELS[f] ?? f}:</span>
            <span className="text-muted-foreground line-through">{show(f, proposal.before?.[f])}</span>
            <span aria-hidden>→</span>
            <span className="font-semibold text-foreground">{show(f, proposal.changes[f])}</span>
          </li>
        ))}
      </ul>

      {done ? (
        <p className="mt-2.5 text-xs font-medium text-muted-foreground">
          {done === "applied" ? "✓ Đã áp dụng" : "Đã bỏ qua đề xuất này"}
        </p>
      ) : (
        <div className="mt-2.5 flex gap-2">
          <Button type="button" size="sm" className="gap-1.5" disabled={update.isPending} onClick={apply}>
            <Check className="h-3.5 w-3.5" /> {update.isPending ? "Đang lưu…" : "Duyệt & áp dụng"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setDone("rejected")}>
            <X className="h-3.5 w-3.5" /> Bỏ qua
          </Button>
        </div>
      )}
    </div>
  );
}
