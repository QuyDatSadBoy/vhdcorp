"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Edit, Trash2, Plus } from "lucide-react";
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
} from "@/services/category.service";
import ImageUploader from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "@/types/domain";
import { slugify } from "@/lib/utils";



interface CategoryNode extends Category {
  children?: CategoryNode[];
  __depth?: number;
}

// L\u00e0m ph\u1eb3ng cay danh m\u1ee5c, gi\u1eef th\u1ee9 t\u1ef1 l\u1ed3ng + th\u1ec9 \u0111\u1ed9 s\u00e2u \u0111\u1ec3 indent.
function flattenTree(items: CategoryNode[] | undefined, depth = 0): CategoryNode[] {
  if (!items) return [];
  const out: CategoryNode[] = [];
  for (const it of items) {
    out.push({ ...it, __depth: depth });
    if (it.children?.length) out.push(...flattenTree(it.children, depth + 1));
  }
  return out;
}

export default function AdminCategoriesPage() {
  const { data, isLoading } = useCategories({ includeChildren: true });
  // Chỉ lấy root + flatten qua descendants để hiển thị dạng cay (indent theo depth).
  const flatTree = useMemo(() => {
    const list = (data ?? []) as CategoryNode[];
    const roots = list.filter((c) => !c.parentId);
    return flattenTree(roots);
  }, [data]);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [order, setOrder] = useState(0);

  function openNew() {
    setEditing(null); setName(""); setSlug(""); setImage(""); setDescription(""); setParentId("none"); setOrder(0);
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name); setSlug(c.slug); setImage(c.image ?? ""); setDescription(c.description ?? "");
    setParentId(c.parentId ? String(c.parentId) : "none"); setOrder(c.order);
    setOpen(true);
  }

  async function save() {
    const payload = {
      name, slug, image: image || null, description: description || null,
      parentId: parentId === "none" ? null : Number(parentId),
      order,
    } as Partial<Category>;
    try {
      if (editing) await update.mutateAsync({ id: editing.id, payload });
      else await create.mutateAsync(payload);
      toast.success("Đã lưu");
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lưu thất bại"); }
  }

  return (
    <div>
      <motion.div suppressHydrationWarning initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Danh mục</h1>
          <p className="text-sm text-muted-foreground">Quản lý cây danh mục đa cấp</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Thêm danh mục</Button>
      </motion.div>

      {isLoading ? <p>Đang tải...</p> : (
        <div className="space-y-2">
          {flatTree.map((c) => (
            <Card key={c.id} className="overflow-hidden" style={{ marginLeft: (c.__depth ?? 0) * 24 }}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {c.image && <Image src={c.image} alt={c.name} fill sizes="40px" className="object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{(c.__depth ?? 0) > 0 ? "└ " : ""}{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">/{c.slug} · thứ tự {c.order}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label="Sửa"><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Xóa" onClick={async () => {
                    if (!confirm(`Xóa "${c.name}"?`)) return;
                    try { await del.mutateAsync(c.id); toast.success("Đã xóa"); }
                    catch (e) { toast.error(e instanceof Error ? e.message : "Xóa thất bại"); }
                  }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
            <DialogDescription>Nhập tên, slug và chọn danh mục cha nếu cần.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Tên</Label><Input value={name} onChange={(e) => {
              const v = e.target.value;
              setName(v);
              // Tự sinh slug khi user chưa tự gõ slug (chỉ áp dụng cho tạo mới).
              if (!editing && (slug === "" || slug === slugify(name))) setSlug(slugify(v));
            }} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
            <div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            <div className="space-y-2"><Label>Danh mục cha</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Không có —</SelectItem>
                  {(data ?? []).filter((c) => !editing || c.id !== editing.id).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Thứ tự</Label><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Ảnh đại diện</Label>
              <ImageUploader value={image} onChange={setImage} folder="categories" aspect="square" allowUrlInput label="ảnh danh mục" />
            </div>
            <Button className="w-full" onClick={save}>{editing ? "Cập nhật" : "Tạo mới"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
