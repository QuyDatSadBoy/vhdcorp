"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Edit, Trash2, Plus } from "lucide-react";
import { useAdminBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from "@/services/banner.service";
import ImageUploader from "@/components/admin/image-uploader";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Banner } from "@/types/domain";

export default function AdminBannersPage() {
  const { data, isLoading } = useAdminBanners();
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const del = useDeleteBanner();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [alt, setAlt] = useState("");
  const [position, setPosition] = useState("home-hero");
  const [active, setActive] = useState(true);
  const [order, setOrder] = useState(0);

  function openNew() {
    setEditing(null);
    setImageUrl("");
    setLink("");
    setAlt("");
    setPosition("home-hero");
    setActive(true);
    setOrder(0);
    setOpen(true);
  }
  function openEdit(b: Banner) {
    setEditing(b);
    setImageUrl(b.imageUrl);
    setLink(b.link ?? "");
    setAlt(b.alt ?? "");
    setPosition(b.position);
    setActive(b.active);
    setOrder(b.order);
    setOpen(true);
  }

  async function save() {
    const payload: Partial<Banner> = { imageUrl, link: link || null, alt: alt || null, position, active, order };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, payload });
      else await create.mutateAsync(payload);
      toast.success("Đã lưu");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    }
  }

  return (
    <div>
      <motion.div
        suppressHydrationWarning
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-2xl font-bold">Banner</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Thêm banner
        </Button>
      </motion.div>
      {isLoading ? (
        <p>Đang tải...</p>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="mb-2 text-base">Chưa có banner nào.</p>
            <p className="text-sm">
              Bấm <span className="font-semibold">Thêm banner</span> để tạo banner đầu tiên cho trang chủ / landing
              page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded bg-muted">
                  {b.imageUrl && (b.imageUrl.startsWith("/") || b.imageUrl.startsWith("http")) ? (
                    <Image src={b.imageUrl} alt={b.alt ?? ""} fill sizes="128px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.alt || "(không có alt)"}</p>
                  <p className="text-xs text-muted-foreground">
                    Vị trí: {b.position} · Thứ tự {b.order} · {b.active ? "Hiện" : "Ẩn"}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)} aria-label="Sửa">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Xóa"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Xóa banner?",
                          description: "Banner sẽ bị xóa khỏi vị trí hiển thị trên website.",
                          confirmText: "Xóa",
                          variant: "destructive",
                        });
                        if (!ok) return;
                        try {
                          await del.mutateAsync(b.id);
                          toast.success("Đã xóa");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Xóa thất bại");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa banner" : "Thêm banner"}</DialogTitle>
            <DialogDescription>Tải ảnh, đặt vị trí (key), link đích và bật/tắt hiển thị.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Ảnh banner</Label>
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                folder="banners"
                aspect="wide"
                allowUrlInput
                label="ảnh banner"
              />
            </div>
            <div className="space-y-2">
              <Label>Vị trí (key)</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link đích</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alt text</Label>
              <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Thứ tự</Label>
              <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Hiển thị</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <Button className="w-full" onClick={save}>
              {editing ? "Cập nhật" : "Tạo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
