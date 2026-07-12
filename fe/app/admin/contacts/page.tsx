"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Undo2, Trash2, ChevronLeft, ChevronRight, Reply } from "lucide-react";
import {
  useAdminContacts,
  useSetContactStatus,
  contactService,
  type ContactStatus,
  type ContactMessage,
} from "@/services/contact.service";
import { useQueryClient } from "@tanstack/react-query";
import { AdminTable } from "@/components/admin/admin-table";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

const statusFilters: { value: ContactStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tất cả" },
  { value: "NEW", label: "Mới" },
  { value: "HANDLED", label: "Đã xử lý" },
];

export default function AdminContactsPage() {
  const [status, setStatus] = useState<ContactStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useAdminContacts({ status, pageNumber: page, pageSize: PAGE_SIZE });
  const setContactStatus = useSetContactStatus();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const totalPages = data?.totalPages ?? 1;

  /** Bấm vào nội dung để mở rộng / thu gọn tin nhắn */
  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: "Xóa liên hệ?",
      description: "Liên hệ sẽ bị xóa vĩnh viễn khỏi hộp thư.",
      confirmText: "Xóa",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await contactService.remove(id);
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Đã xóa");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    }
  }

  return (
    <div>
      <AdminTable<ContactMessage>
        title="Hộp thư liên hệ"
        description="Tin nhắn khách hàng gửi từ form liên hệ"
        isLoading={isLoading}
        rows={data?.records}
        emptyText="Chưa có liên hệ nào."
        toolbar={
          <div className="flex items-center gap-1">
            {statusFilters.map((f) => (
              <Button
                key={f.label}
                size="sm"
                variant={status === f.value ? "default" : "outline"}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        }
        columns={[
          { key: "name", header: "Tên", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "email", header: "Email", render: (r) => r.email },
          { key: "phone", header: "SĐT", render: (r) => r.phone ?? "—" },
          { key: "subject", header: "Tiêu đề", render: (r) => r.subject ?? "—" },
          {
            key: "message",
            header: "Nội dung",
            render: (r) => (
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                className="cursor-pointer text-left"
                title={expanded.has(r.id) ? "Thu gọn" : "Xem đầy đủ"}
              >
                <p className={`max-w-md whitespace-pre-line ${expanded.has(r.id) ? "" : "line-clamp-2"}`}>
                  {r.message}
                </p>
              </button>
            ),
          },
          {
            key: "createdAt",
            header: "Thời gian",
            render: (r) => (
              <span className="whitespace-nowrap text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("vi-VN")}
              </span>
            ),
          },
          {
            key: "status",
            header: "Trạng thái",
            render: (r) => (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${r.status === "HANDLED" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}
              >
                {r.status === "HANDLED" ? "Đã xử lý" : "Mới"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-28",
            render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" aria-label="Trả lời qua email" title="Trả lời qua email" asChild>
                  <a
                    href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject || "Liên hệ VHD Corp"}`)}&body=${encodeURIComponent(`Chào ${r.name},\n\nCảm ơn bạn đã liên hệ VHD Corp.\n\n`)}`}
                  >
                    <Reply className="h-4 w-4 text-brand-primary" />
                  </a>
                </Button>
                {r.status === "NEW" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Đánh dấu đã xử lý"
                    onClick={() => setContactStatus.mutate({ id: r.id, status: "HANDLED" })}
                  >
                    <Check className="h-4 w-4 text-emerald-500" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Đánh dấu chưa xử lý"
                    onClick={() => setContactStatus.mutate({ id: r.id, status: "NEW" })}
                  >
                    <Undo2 className="h-4 w-4 text-amber-500" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" aria-label="Xóa" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {data?.currentPage ?? page}/{totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
