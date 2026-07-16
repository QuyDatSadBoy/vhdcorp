"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/price";
import { useAdminOrders, useUpdateOrderStatus } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types/domain";

const STATUS_LABEL: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Chờ xác nhận", cls: "bg-amber-500/15 text-amber-600" },
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-sky-500/15 text-sky-600" },
  SHIPPING: { label: "Đang giao", cls: "bg-indigo-500/15 text-indigo-600" },
  DONE: { label: "Hoàn tất", cls: "bg-emerald-500/15 text-emerald-600" },
  CANCELLED: { label: "Đã hủy", cls: "bg-rose-500/15 text-rose-600" },
};
const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DONE", "CANCELLED"];

const filters: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tất cả" },
  ...FLOW.map((s) => ({ value: s, label: STATUS_LABEL[s].label })),
];

/** Quản lý đơn hàng: xem chi tiết, chuyển trạng thái (khách theo dõi được ở tài khoản). */
export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading } = useAdminOrders(page, status);
  const updateStatus = useUpdateOrderStatus();
  const totalPages = data?.totalPages ?? 1;

  async function setOrderStatus(o: Order, s: OrderStatus) {
    try {
      await updateStatus.mutateAsync({ id: o.id, status: s });
      toast.success(`Đơn ${o.code} → ${STATUS_LABEL[s].label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShoppingCart className="h-6 w-6 text-brand-primary" /> Đơn hàng
        </h1>
        <p className="text-sm text-muted-foreground">
          Khách đặt hàng không thanh toán online — mail báo về hộp thư admin, gọi điện xác nhận rồi chuyển trạng thái
          tại đây.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            className="rounded-full"
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">Mã đơn</th>
              <th className="p-3 text-left font-medium">Khách hàng</th>
              <th className="p-3 text-right font-medium">Tổng tiền</th>
              <th className="p-3 text-left font-medium">Trạng thái</th>
              <th className="p-3 text-left font-medium">Ngày đặt</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && !data?.records.length && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  Chưa có đơn hàng nào.
                </td>
              </tr>
            )}
            {data?.records.map((o) => {
              const st = STATUS_LABEL[o.status];
              const expanded = open === o.id;
              return [
                <tr key={o.id} className="border-t hover:bg-accent/30">
                  <td className="p-3 font-bold">{o.code}</td>
                  <td className="p-3">
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.phone} · {o.email}
                    </p>
                  </td>
                  <td className="p-3 text-right font-bold text-brand-primary">{formatVnd(o.total)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setOpen(expanded ? null : o.id)}>
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Chi tiết
                    </Button>
                  </td>
                </tr>,
                expanded ? (
                  <tr key={`${o.id}-detail`} className="border-t bg-muted/30">
                    <td colSpan={6} className="p-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <div>
                          <p className="text-sm">
                            <b>Giao tới:</b> {o.address}
                          </p>
                          {o.note && (
                            <p className="mt-1 text-sm">
                              <b>Ghi chú:</b> {o.note}
                            </p>
                          )}
                          <ul className="mt-3 space-y-1 text-sm">
                            {o.items.map((i) => (
                              <li key={i.id} className="flex max-w-md justify-between gap-6">
                                <span>
                                  {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                                </span>
                                <span>{formatVnd(Number(i.price) * i.qty)}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Tạm tính {formatVnd(o.subtotal)}
                            {Number(o.discount) > 0 && (
                              <>
                                {" "}
                                · Giảm {formatVnd(o.discount)} ({o.voucherCode})
                              </>
                            )}{" "}
                            · <b className="text-foreground">Tổng {formatVnd(o.total)}</b>
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Chuyển trạng thái
                          </p>
                          {FLOW.filter((s) => s !== o.status).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={s === "CANCELLED" ? "destructive" : "outline"}
                              className="justify-start"
                              disabled={updateStatus.isPending}
                              onClick={() => void setOrderStatus(o, s)}
                            >
                              {STATUS_LABEL[s].label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {page}/{totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
