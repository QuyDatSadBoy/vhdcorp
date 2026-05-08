"use client";

import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";
import { useAdminReviews, useSetReviewStatus, reviewService } from "@/services/review.service";
import { useQueryClient } from "@tanstack/react-query";
import { AdminTable } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";

export default function AdminReviewsPage() {
  const { data, isLoading } = useAdminReviews({ pageSize: 50 });
  const setStatus = useSetReviewStatus();
  const qc = useQueryClient();

  async function remove(id: number) {
    if (!confirm("Xóa đánh giá này?")) return;
    try { await reviewService.remove(id); qc.invalidateQueries({ queryKey: ["reviews"] }); toast.success("Đã xóa"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Xóa thất bại"); }
  }

  return (
    <AdminTable
      title="Đánh giá sản phẩm"
      description="Duyệt / từ chối đánh giá khách hàng"
      isLoading={isLoading}
      rows={data?.records}
      columns={[
        { key: "user", header: "Khách", render: (r) => r.user?.name ?? "—" },
        { key: "product", header: "Sản phẩm", render: (r) => r.product?.name ?? "—" },
        { key: "rating", header: "Sao", render: (r) => `${r.rating}/5` },
        { key: "content", header: "Nội dung", render: (r) => <p className="line-clamp-2 max-w-md">{r.content}</p> },
        { key: "status", header: "Trạng thái", render: (r) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600" : r.status === "REJECTED" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>{r.status}</span>
        ) },
        { key: "actions", header: "", className: "text-right w-40", render: (r) => (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label="Duyệt" onClick={() => setStatus.mutate({ id: r.id, status: "APPROVED" })}><Check className="h-4 w-4 text-emerald-500" /></Button>
            <Button size="icon" variant="ghost" aria-label="Từ chối" onClick={() => setStatus.mutate({ id: r.id, status: "REJECTED" })}><X className="h-4 w-4 text-red-500" /></Button>
            <Button size="icon" variant="ghost" aria-label="Xóa" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ) },
      ]}
    />
  );
}
