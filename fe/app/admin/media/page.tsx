"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Upload, Copy, Trash2, ImageOff } from "lucide-react";
import { useMediaList, uploadToCloudinary, useDeleteMedia } from "@/services/media.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function MediaThumb({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={
          "absolute inset-0 h-full w-full object-cover transition-opacity " +
          (errored ? "opacity-0" : "opacity-100")
        }
        onError={() => setErrored(true)}
      />
      {errored ? (
        <div className="absolute inset-0 grid place-items-center bg-muted/60 text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <ImageOff className="h-6 w-6" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Không tải được</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminMediaPage() {
  const { data, isLoading, refetch } = useMediaList({ pageSize: 100 });
  const del = useDeleteMedia();
  const [uploading, setUploading] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      await Promise.all(Array.from(files).map((f) => uploadToCloudinary(f, "library")));
      toast.success(`Đã tải ${files.length} ảnh`);
      refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    toast.success("Đã sao chép URL");
  }

  return (
    <div>
      <motion.div suppressHydrationWarning initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Thư viện ảnh</h1><p className="text-sm text-muted-foreground">Tải lên và quản lý ảnh dùng chung</p></div>
        <label className="cursor-pointer">
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} />
          <span className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Tải lên
          </span>
        </label>
      </motion.div>

      {isLoading ? <p>Đang tải...</p> : (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
          {(data?.records ?? []).map((m) => (
            <Card key={m.id} className="group overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <MediaThumb src={m.url} alt={m.publicId ?? ""} />
              </div>
              <CardContent className="p-2 flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => copy(m.url)}><Copy className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" aria-label="Xóa" onClick={async () => {
                  if (!confirm("Xóa ảnh?")) return;
                  try { await del.mutateAsync(m.id); toast.success("Đã xóa"); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Xóa thất bại"); }
                }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
