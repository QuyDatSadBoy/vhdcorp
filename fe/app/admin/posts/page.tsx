"use client";

import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminPosts, useDeletePost } from "@/services/post.service";
import { AdminTable } from "@/components/admin/admin-table";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

export default function AdminPostsPage() {
  const { data, isLoading } = useAdminPosts({ pageSize: 50 });
  const del = useDeletePost();
  const confirm = useConfirm();

  return (
    <AdminTable
      title="Bài viết"
      newHref="/admin/posts/new"
      isLoading={isLoading}
      rows={data?.records}
      columns={[
        {
          key: "title",
          header: "Tiêu đề",
          render: (p) => (
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">/{p.slug}</p>
            </div>
          ),
        },
        {
          key: "status",
          header: "Trạng thái",
          render: (p) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${p.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}
            >
              {p.status}
            </span>
          ),
        },
        {
          key: "publishedAt",
          header: "Xuất bản",
          render: (p) => (p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("vi-VN") : "—"),
        },
        {
          key: "actions",
          header: "",
          className: "text-right w-28",
          render: (p) => (
            <div className="flex justify-end gap-1">
              <Button asChild size="icon" variant="ghost">
                <Link href={`/admin/posts/${p.id}`} aria-label="Sửa">
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Xóa"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Xóa bài viết?",
                    description: `Bài "${p.title}" sẽ bị xóa khỏi hệ thống.`,
                    confirmText: "Xóa",
                    variant: "destructive",
                  });
                  if (!ok) return;
                  try {
                    await del.mutateAsync(p.id);
                    toast.success("Đã xóa");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Xóa thất bại");
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
