"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/services/media.service";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ImageUploaderProps {
  /** URL hiện tại (controlled) */
  value?: string;
  /** Callback khi upload xong hoặc xóa */
  onChange: (url: string) => void;
  /** Folder Cloudinary (banners, products, categories, posts, brand, ...) */
  folder?: string;
  /** Tỷ lệ ảnh preview (mặc định vuông) */
  aspect?: "square" | "video" | "wide";
  /** Cho phép paste URL trực tiếp ngoài upload */
  allowUrlInput?: boolean;
  /** Label hiển thị (a11y) */
  label?: string;
  className?: string;
  /** Kích thước max bytes (mặc định 5MB) */
  maxBytes?: number;
}

/**
 * ImageUploader — UX tuyệt hảo cho admin:
 * - Drag & drop hoặc click để chọn file → tự upload Cloudinary → onChange URL
 * - Preview ảnh ngay sau khi upload
 * - Nút xóa, nút thay ảnh
 * - Optional: dán URL nếu admin có sẵn link
 */
export default function ImageUploader({
  value,
  onChange,
  folder = "vhdcorp",
  aspect = "square",
  allowUrlInput = false,
  label = "Ảnh",
  className,
  maxBytes = 5 * 1024 * 1024,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const aspectClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[16/6]",
  }[aspect];

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`File quá lớn (tối đa ${Math.round(maxBytes / 1024 / 1024)}MB)`);
      return;
    }
    setUploading(true);
    try {
      const m = await uploadToCloudinary(file, folder);
      onChange(m.url);
      toast.success("Đã tải ảnh lên Cloudinary");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload thất bại";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition",
          aspectClass,
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt={label}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-3 text-xs font-medium text-foreground shadow hover:bg-white/90"
              >
                <Upload className="h-3.5 w-3.5" /> Đổi
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-destructive px-3 text-xs font-medium text-white shadow hover:bg-destructive/90"
              >
                <X className="h-3.5 w-3.5" /> Xóa
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
            <p className="text-sm font-medium">
              {uploading ? "Đang tải..." : `Kéo & thả hoặc bấm để chọn ${label}`}
            </p>
            <p className="text-xs">PNG, JPG, WEBP, GIF — tối đa {Math.round(maxBytes / 1024 / 1024)}MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label={`Chọn file ${label}`}
          title={`Chọn file ${label}`}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {allowUrlInput && (
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="hoặc dán URL ảnh có sẵn"
          className="text-xs"
        />
      )}
    </div>
  );
}
