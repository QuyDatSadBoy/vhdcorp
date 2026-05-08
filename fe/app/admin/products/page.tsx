"use client";

import Link from "next/link";
import Image from "next/image";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminProducts, useDeleteProduct } from "@/services/product.service";
import { AdminTable } from "@/components/admin/admin-table";
import { Button } from "@/components/ui/button";

export default function AdminProductsPage() {
  const { data, isLoading } = useAdminProducts({ pageSize: 50 });
  const del = useDeleteProduct();

  return (
    <AdminTable
      title="Sản phẩm"
      description="Quản lý toàn bộ sản phẩm trên website"
      newHref="/admin/products/new"
      isLoading={isLoading}
      rows={data?.records}
      columns={[
        {
          key: "image",
          header: "Ảnh",
          render: (p) => (
            <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
              {p.images?.[0] && <Image src={p.images[0]} alt={p.name} fill sizes="48px" className="object-cover" />}
            </div>
          ),
          className: "w-20",
        },
        { key: "name", header: "Tên", render: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">/{p.slug}</p></div> },
        { key: "price", header: "Giá", render: (p) => <>{Number(p.price).toLocaleString("vi-VN")} ₫</> },
        { key: "stock", header: "Tồn", render: (p) => p.stock },
        { key: "status", header: "Trạng thái", render: (p) => (
          <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
        ) },
        {
          key: "actions",
          header: "",
          className: "text-right w-32",
          render: (p) => (
            <div className="flex justify-end gap-1">
              <Button asChild variant="ghost" size="icon"><Link href={`/admin/products/${p.id}`} aria-label="Sửa"><Edit className="h-4 w-4" /></Link></Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xóa"
                onClick={async () => {
                  if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return;
                  try { await del.mutateAsync(p.id); toast.success("Đã xóa"); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Xóa thất bại"); }
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
