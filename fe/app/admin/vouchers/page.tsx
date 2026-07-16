"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { formatVnd } from "@/lib/price";
import { useAdminVouchers, useDeleteVoucher, useSaveVoucher } from "@/services/order.service";
import type { Voucher } from "@/types/domain";

const EMPTY = {
  code: "",
  type: "PERCENT" as Voucher["type"],
  value: "10",
  minOrder: "0",
  maxUses: "0",
  startsAt: "",
  endsAt: "",
  active: true,
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Quản lý voucher kiểu Shopee: mã, loại %/tiền, đơn tối thiểu, số lượt, thời hạn, bật/tắt. */
export default function AdminVouchersPage() {
  const { data, isLoading } = useAdminVouchers();
  const save = useSaveVoucher();
  const del = useDeleteVoucher();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<number | null | "new">(null);
  const [form, setForm] = useState(EMPTY);

  const openNew = () => {
    setForm(EMPTY);
    setEditing("new");
  };
  const openEdit = (v: Voucher) => {
    setForm({
      code: v.code,
      type: v.type,
      value: String(Number(v.value)),
      minOrder: String(Number(v.minOrder)),
      maxUses: String(v.maxUses),
      startsAt: toLocalInput(v.startsAt),
      endsAt: toLocalInput(v.endsAt),
      active: v.active,
    });
    setEditing(v.id);
  };

  const submit = async () => {
    if (!form.code.trim() || !form.endsAt) {
      toast.error("Nhập mã voucher và ngày hết hạn");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing === "new" ? undefined : (editing as number),
        payload: {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: Number(form.value),
          minOrder: Number(form.minOrder) || 0,
          maxUses: Number(form.maxUses) || 0,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: new Date(form.endsAt).toISOString(),
          active: form.active,
        },
      });
      toast.success(editing === "new" ? "Đã tạo voucher" : "Đã cập nhật voucher");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu voucher thất bại");
    }
  };

  const remove = async (v: Voucher) => {
    const ok = await confirm({
      title: `Xóa voucher ${v.code}?`,
      description: "Khách sẽ không dùng được mã này nữa (đơn cũ không ảnh hưởng).",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(v.id);
      toast.success("Đã xóa voucher");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xóa thất bại");
    }
  };

  const now = new Date();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BadgePercent className="h-6 w-6 text-brand-primary" /> Voucher
          </h1>
          <p className="text-sm text-muted-foreground">
            Mã giảm giá cho giỏ hàng: giảm % hoặc số tiền, đơn tối thiểu, giới hạn lượt dùng và thời hạn.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Tạo voucher
        </Button>
      </div>

      {editing !== null && (
        <Card className="border-brand-primary/30">
          <CardContent className="space-y-4 p-5">
            <p className="font-semibold">{editing === "new" ? "Tạo voucher mới" : `Sửa voucher #${editing}`}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Mã (khách nhập ở giỏ hàng)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="GIAM10"
                  className="uppercase"
                  disabled={editing !== "new"}
                />
              </div>
              <div className="space-y-1">
                <Label>Loại giảm</Label>
                <select
                  aria-label="Loại giảm"
                  className="h-9 w-full rounded-md border bg-transparent px-2.5 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Voucher["type"] })}
                >
                  <option value="PERCENT">Giảm theo % đơn</option>
                  <option value="FIXED">Giảm số tiền cố định</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{form.type === "PERCENT" ? "Phần trăm giảm (1–100)" : "Số tiền giảm (VND)"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Đơn tối thiểu (VND, 0 = không giới hạn)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Số lượt dùng tối đa (0 = vô hạn)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Bắt đầu (bỏ trống = ngay bây giờ)</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Hết hạn *</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="voucher-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <Label htmlFor="voucher-active">Đang bật</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void submit()} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu voucher
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 text-left font-medium">Mã</th>
              <th className="p-3 text-left font-medium">Giảm</th>
              <th className="p-3 text-left font-medium">Đơn tối thiểu</th>
              <th className="p-3 text-left font-medium">Lượt dùng</th>
              <th className="p-3 text-left font-medium">Hiệu lực</th>
              <th className="p-3 text-left font-medium">Trạng thái</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  Chưa có voucher nào — bấm &quot;Tạo voucher&quot; để bắt đầu.
                </td>
              </tr>
            )}
            {data?.map((v) => {
              const expired = new Date(v.endsAt) < now;
              const exhausted = v.maxUses > 0 && v.usedCount >= v.maxUses;
              return (
                <tr key={v.id} className="border-t hover:bg-accent/30">
                  <td className="p-3 font-bold">{v.code}</td>
                  <td className="p-3">{v.type === "PERCENT" ? `${Number(v.value)}%` : formatVnd(v.value)}</td>
                  <td className="p-3">{Number(v.minOrder) > 0 ? formatVnd(v.minOrder) : "—"}</td>
                  <td className="p-3">
                    {v.usedCount}/{v.maxUses > 0 ? v.maxUses : "∞"}
                  </td>
                  <td className="p-3 text-xs">
                    {new Date(v.startsAt).toLocaleDateString("vi-VN")} →{" "}
                    {new Date(v.endsAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        !v.active
                          ? "bg-gray-500/15 text-gray-500"
                          : expired
                            ? "bg-rose-500/15 text-rose-600"
                            : exhausted
                              ? "bg-amber-500/15 text-amber-600"
                              : "bg-emerald-500/15 text-emerald-600"
                      }`}
                    >
                      {!v.active ? "Đang tắt" : expired ? "Hết hạn" : exhausted ? "Hết lượt" : "Đang chạy"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)} aria-label="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-500"
                      onClick={() => void remove(v)}
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
