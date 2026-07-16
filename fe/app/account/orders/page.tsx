"use client";

import Link from "next/link";
import { Loader2, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/price";
import { useMyOrders } from "@/services/order.service";
import { useAuthStore } from "@/store/auth.store";
import type { OrderStatus } from "@/types/domain";

const STATUS_LABEL: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Chờ xác nhận", cls: "bg-amber-500/15 text-amber-600" },
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-sky-500/15 text-sky-600" },
  SHIPPING: { label: "Đang giao", cls: "bg-indigo-500/15 text-indigo-600" },
  DONE: { label: "Hoàn tất", cls: "bg-emerald-500/15 text-emerald-600" },
  CANCELLED: { label: "Đã hủy", cls: "bg-rose-500/15 text-rose-600" },
};

/** Lịch sử + trạng thái đơn của khách đang đăng nhập (đơn đặt khi đã đăng nhập). */
export default function MyOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const q = useMyOrders(Boolean(user));

  if (q.isLoading)
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    );

  const orders = q.data ?? [];
  if (orders.length === 0)
    return (
      <div className="py-14 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-primary/10">
          <PackageOpen className="h-7 w-7 text-brand-primary" />
        </div>
        <p className="font-semibold">Chưa có đơn hàng nào</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Đơn đặt khi đã đăng nhập sẽ hiển thị ở đây để bạn theo dõi trạng thái.
        </p>
        <Button asChild className="mt-5 rounded-full">
          <Link href="/products">Mua sắm ngay</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Đơn hàng của tôi</h1>
      {orders.map((o) => {
        const st = STATUS_LABEL[o.status];
        return (
          <Card key={o.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{o.code}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Đặt lúc {new Date(o.createdAt).toLocaleString("vi-VN")} · Giao tới: {o.address}
              </p>
              <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                    </span>
                    <span className="font-medium">{formatVnd(Number(i.price) * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {Number(o.discount) > 0 && (
                    <>
                      Giảm {formatVnd(o.discount)} ({o.voucherCode}) ·{" "}
                    </>
                  )}
                  Tổng cộng
                </span>
                <span className="font-extrabold text-brand-primary">{formatVnd(o.total)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
