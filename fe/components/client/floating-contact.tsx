"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook,
  Instagram,
  Link as LinkIcon,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Plus,
  Send,
  X,
  Youtube,
} from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";
import type { ContactChannel } from "@/types/site-config";

type IconComponent = React.ComponentType<{ className?: string }>;

/** Preset icon + màu thương hiệu + nhãn mặc định cho từng kênh (đồng bộ ContactChannelIcon) */
export const CHANNEL_PRESETS: Record<string, { icon: IconComponent; color: string; label: string }> = {
  facebook: { icon: Facebook, color: "bg-[#1877f2]", label: "Facebook" },
  messenger: { icon: MessageCircle, color: "bg-[#0084ff]", label: "Messenger" },
  zalo: { icon: MessageCircle, color: "bg-[#0068ff]", label: "Zalo" },
  phone: { icon: Phone, color: "bg-emerald-500", label: "Gọi ngay" },
  email: { icon: Mail, color: "bg-amber-500", label: "Email" },
  tiktok: { icon: Music2, color: "bg-black", label: "TikTok" },
  youtube: { icon: Youtube, color: "bg-[#ff0000]", label: "YouTube" },
  instagram: { icon: Instagram, color: "bg-[#e4405f]", label: "Instagram" },
  linkedin: { icon: Linkedin, color: "bg-[#0a66c2]", label: "LinkedIn" },
  telegram: { icon: Send, color: "bg-[#229ed9]", label: "Telegram" },
  whatsapp: { icon: MessageCircle, color: "bg-[#25d366]", label: "WhatsApp" },
  link: { icon: LinkIcon, color: "bg-slate-500", label: "Liên kết" },
};

/** Chuẩn hóa href: số điện thoại → tel:, email → mailto:, còn lại giữ nguyên */
function toHref(icon: string, url: string): string {
  const value = url.trim();
  if (/^(https?:|tel:|mailto:)/i.test(value)) return value;
  if (icon === "phone" || /^[\d\s+().-]{6,}$/.test(value)) return `tel:${value.replace(/\s+/g, "")}`;
  if (icon === "email" || value.includes("@")) return `mailto:${value}`;
  return value.startsWith("//") ? `https:${value}` : `https://${value}`;
}

interface RenderItem {
  key: string;
  label: string;
  href: string;
  icon: IconComponent;
  color: string;
  /** Ảnh icon tùy chỉnh — có thì render thay icon preset */
  image?: string;
}

/**
 * Floating contact widget — admin cấu hình 100% qua SiteConfig.footer.contact:
 * - `channels`: danh sách kênh tùy chỉnh (icon + nhãn + link) — thêm/xóa/sắp xếp tự do.
 * - Không có `channels` → fallback legacy: Messenger / Zalo / Hotline / Email.
 * - `floatingWidget === false` → ẩn hoàn toàn.
 */
export default function FloatingContact() {
  const config = useSiteConfigStore((s) => s.config);
  const c = config?.footer?.contact;
  const [open, setOpen] = useState(false);

  // Chỉ ẩn khi admin tắt rõ ràng — mặc định hiển thị nếu có ít nhất một kênh liên hệ
  if (c?.floatingWidget === false) return null;

  const channels = (c?.channels ?? []).filter((ch: ContactChannel) => ch.url?.trim());
  const items: RenderItem[] = [];

  if (channels.length > 0) {
    for (const ch of channels) {
      const preset = CHANNEL_PRESETS[ch.icon] ?? CHANNEL_PRESETS.link;
      items.push({
        key: ch.id,
        label: ch.label?.trim() || preset.label,
        href: toHref(ch.icon, ch.url),
        icon: preset.icon,
        color: preset.color,
        image: ch.image,
      });
    }
  } else {
    // Legacy: config cũ chưa có channels — suy ra từ các field liên hệ sẵn có
    if (c?.messengerUrl)
      items.push({
        key: "messenger",
        label: "Messenger",
        href: c.messengerUrl,
        icon: MessageCircle,
        color: "bg-[#0084ff]",
      });
    if (c?.zaloUrl)
      items.push({ key: "zalo", label: "Zalo", href: c.zaloUrl, icon: MessageCircle, color: "bg-[#0068ff]" });
    const tel = c?.hotline || c?.phone;
    if (tel)
      items.push({
        key: "phone",
        label: "Gọi ngay",
        href: `tel:${tel.replace(/\s+/g, "")}`,
        icon: Phone,
        color: "bg-emerald-500",
      });
    if (c?.email)
      items.push({ key: "email", label: "Email", href: `mailto:${c.email}`, icon: Mail, color: "bg-amber-500" });
  }

  if (items.length === 0) return null;

  return (
    // bottom-24: dời lên trên nút chat AI (ChatWidget chiếm vị trí bottom-6 right-6)
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3" aria-label="Liên hệ nhanh">
      <AnimatePresence>
        {open &&
          items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.a
                key={it.key}
                href={it.href}
                target={it.href.startsWith("http") ? "_blank" : undefined}
                rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}
                suppressHydrationWarning
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, y: 12, scale: 0.8 }}
                className={`group flex items-center gap-2 rounded-full ${it.color} px-3 py-2 text-white shadow-lg hover:shadow-xl`}
                aria-label={it.label}
              >
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- icon nhỏ admin tải lên (Cloudinary)
                  <img src={it.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="hidden text-xs font-semibold sm:inline">{it.label}</span>
              </motion.a>
            );
          })}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Đóng menu liên hệ" : "Mở menu liên hệ"}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand-primary text-white shadow-xl ring-4 ring-brand-primary/20 transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
