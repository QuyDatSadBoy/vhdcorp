"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import type { Product } from "@/types/domain";
import { aiApi } from "@/services/ai.service";
import { useCreateProduct, useUpdateProduct } from "@/services/product.service";
import { useCategories } from "@/services/category.service";
import { uploadToCloudinary } from "@/services/media.service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RichEditor } from "@/components/admin/rich-editor";
import { slugify } from "@/lib/utils";

interface Props {
  initial?: Product;
}

export function ProductForm({ initial }: Props) {
  const router = useRouter();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { data: categories } = useCategories();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const slugLocked = useRef(!!initial?.slug);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "0");
  const [salePrice, setSalePrice] = useState(initial?.salePrice ? String(Number(initial.salePrice)) : "");
  const [saleEndsAt, setSaleEndsAt] = useState(() => {
    if (!initial?.saleEndsAt) return "";
    const d = new Date(initial.saleEndsAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [categoryId, setCategoryId] = useState<number | undefined>(initial?.categoryId);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(initial?.status ?? "DRAFT");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(initial?.metaDesc ?? "");
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("Viết chuẩn SEO, súc tích, đúng ngành, nhấn mạnh bán sỉ");
  const [aiLoading, setAiLoading] = useState(false);

  async function handleAiDescribe() {
    if (!images.length && !name.trim()) {
      toast.error("Hãy tải ảnh sản phẩm hoặc nhập tên trước để AI viết mô tả.");
      return;
    }
    setAiLoading(true);
    try {
      const r = await aiApi.productDescription({ images, prompt: aiPrompt, name: name.trim() || undefined });
      if (r.description) setDescription(r.description);
      if (r.name && !name.trim()) setName(r.name);
      if (r.metaTitle) setMetaTitle(r.metaTitle);
      if (r.metaDesc) setMetaDesc(r.metaDesc);
      toast.success("AI đã viết mô tả — bạn kiểm tra và chỉnh lại nếu cần.");
    } catch {
      toast.error("AI không phản hồi, thử lại sau giây lát.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!slugLocked.current && name) {
      setSlug(slugify(name));
    }
  }, [name]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const medias = await Promise.all(Array.from(files).map((f) => uploadToCloudinary(f, "products")));
      setImages((prev) => [...prev, ...medias.map((m) => m.url)]);
      toast.success(`Đã tải ${medias.length} ảnh`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return toast.error("Vui lòng chọn danh mục");
    const payload = {
      name,
      slug,
      description,
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : null,
      saleEndsAt: saleEndsAt ? new Date(saleEndsAt).toISOString() : null,
      stock,
      categoryId,
      status,
      images,
      metaTitle,
      metaDesc,
    };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, payload });
        toast.success("Đã cập nhật");
      } else {
        await create.mutateAsync(payload);
        toast.success("Đã tạo mới");
      }
      router.push("/admin/products");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <motion.form
      suppressHydrationWarning
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Tên sản phẩm</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  slugLocked.current = true;
                  setSlug(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="mr-auto">Mô tả chi tiết</Label>
              </div>
              {/* AI trợ giúp: đọc ảnh đã tải + web search → viết mô tả (sửa prompt được) */}
              <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-brand-primary">
                  <Sparkles className="h-4 w-4" /> AI viết mô tả (đọc ảnh + tìm web)
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Yêu cầu cho AI (vd: ngắn gọn, nêu quy cách…)"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAiDescribe} disabled={aiLoading} className="gap-1.5 shrink-0">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {aiLoading ? "Đang viết…" : "AI viết mô tả"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Mẹo: tải ảnh sản phẩm lên trước → AI đọc ảnh + tra cứu web để viết chính xác hơn. Bạn luôn sửa được.
                </p>
              </div>
              <RichEditor
                value={description}
                onChange={setDescription}
                uploadFolder="products"
                placeholder="Nhập mô tả chi tiết sản phẩm..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">Hình ảnh</h3>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {images.map((src, i) => (
                <div key={src} className="relative aspect-square overflow-hidden rounded border bg-muted">
                  <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                  <button
                    type="button"
                    aria-label="Xóa"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded border border-dashed text-muted-foreground hover:bg-accent/30">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files)}
                />
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">SEO</h3>
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea rows={3} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(v: "DRAFT" | "PUBLISHED") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Bản nháp</SelectItem>
                  <SelectItem value="PUBLISHED">Xuất bản</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select value={categoryId ? String(categoryId) : ""} onValueChange={(v) => setCategoryId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn..." />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Giá (VND)</Label>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
              <p className="text-[11px] text-muted-foreground">
                Để <b>0</b> nếu sản phẩm cần báo giá riêng — site sẽ hiện &quot;Liên hệ báo giá&quot; thay vì giá.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Giá khuyến mãi (VND — bỏ trống nếu không giảm)</Label>
              <Input
                type="number"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="VD: 19000"
              />
              {salePrice && Number(salePrice) >= Number(price) && (
                <p className="text-xs text-amber-600">⚠ Giá KM nên nhỏ hơn giá gốc</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Hạn khuyến mãi (bỏ trống = không hết hạn)</Label>
              <Input type="datetime-local" value={saleEndsAt} onChange={(e) => setSaleEndsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tồn kho</Label>
              <Input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initial ? "Cập nhật" : "Tạo sản phẩm"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.form>
  );
}
