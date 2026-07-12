"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_PRESETS } from "@/components/client/floating-contact";
import { uploadToCloudinary } from "@/services/media.service";
import type { ContactChannel, ContactChannelIcon } from "@/types/site-config";

const ICON_OPTIONS: { value: ContactChannelIcon; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "messenger", label: "Messenger" },
  { value: "zalo", label: "Zalo" },
  { value: "phone", label: "Điện thoại" },
  { value: "email", label: "Email" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "link", label: "Liên kết khác" },
];

const URL_PLACEHOLDER: Partial<Record<ContactChannelIcon, string>> = {
  facebook: "https://facebook.com/vhdcorp",
  messenger: "https://m.me/vhdcorp",
  zalo: "https://zalo.me/0901234567",
  phone: "1900 1234",
  email: "contact@vhdcorp.vn",
  tiktok: "https://tiktok.com/@vhdcorp",
  youtube: "https://youtube.com/@vhdcorp",
  instagram: "https://instagram.com/vhdcorp",
  linkedin: "https://linkedin.com/company/vhdcorp",
  telegram: "https://t.me/vhdcorp",
  whatsapp: "https://wa.me/84901234567",
  link: "https://...",
};

interface Props {
  channels: ContactChannel[];
  onChange: (channels: ContactChannel[]) => void;
}

/**
 * Editor kênh liên hệ nổi (floating widget) — admin thêm/xóa/sắp xếp icon + nhãn + link tự do.
 * Preview icon + màu thương hiệu lấy từ CHANNEL_PRESETS (đúng như hiển thị ngoài trang).
 */
export default function ContactChannelsEditor({ channels, onChange }: Props) {
  /** id kênh đang upload icon — hiện spinner đúng dòng */
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const patch = (idx: number, part: Partial<ContactChannel>) => {
    onChange(channels.map((ch, i) => (i === idx ? { ...ch, ...part } : ch)));
  };

  const uploadIcon = async (idx: number, file: File) => {
    const ch = channels[idx];
    try {
      setUploadingId(ch.id);
      const media = await uploadToCloudinary(file, "channels");
      patch(idx, { image: media.url });
      toast.success("Đã tải icon lên — nhớ Lưu nháp + Xuất bản");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tải icon thất bại");
    } finally {
      setUploadingId(null);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= channels.length) return;
    const next = [...channels];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {channels.map((ch, idx) => {
        const preset = CHANNEL_PRESETS[ch.icon] ?? CHANNEL_PRESETS.link;
        const Icon = preset.icon;
        return (
          <div key={ch.id} className="grid grid-cols-[auto_150px_150px_1fr_auto] items-center gap-2">
            <span
              className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${preset.color}`}
            >
              {ch.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview icon tùy chỉnh (Cloudinary)
                <img src={ch.image} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {ch.image && (
                <button
                  type="button"
                  aria-label="Bỏ icon tùy chỉnh"
                  title="Bỏ icon tùy chỉnh — dùng lại icon mặc định"
                  onClick={() => patch(idx, { image: undefined })}
                  className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background shadow"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
            <Select value={ch.icon} onValueChange={(v) => patch(idx, { icon: v as ContactChannelIcon })}>
              <SelectTrigger aria-label="Loại kênh">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={preset.label}
              aria-label="Nhãn hiển thị"
              value={ch.label ?? ""}
              onChange={(e) => patch(idx, { label: e.target.value })}
            />
            <Input
              placeholder={URL_PLACEHOLDER[ch.icon] ?? "https://..."}
              aria-label="Link / SĐT / email"
              value={ch.url}
              onChange={(e) => patch(idx, { url: e.target.value })}
            />
            <div className="flex items-center">
              {/* Tải icon tùy chỉnh (thay icon preset) */}
              <label
                title="Tải icon riêng (PNG/JPG/SVG)"
                aria-label="Tải icon riêng"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void uploadIcon(idx, file);
                  }}
                />
                {uploadingId === ch.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </label>
              <Button variant="ghost" size="icon" aria-label="Lên" disabled={idx === 0} onClick={() => move(idx, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xuống"
                disabled={idx === channels.length - 1}
                onClick={() => move(idx, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xóa kênh"
                onClick={() => onChange(channels.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...channels, { id: crypto.randomUUID(), icon: "facebook", label: "", url: "" }])}
      >
        + Thêm kênh
      </Button>
    </div>
  );
}
