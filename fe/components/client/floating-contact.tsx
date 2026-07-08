"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, Mail, X, Plus } from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";

/**
 * Floating contact widget — admin có thể bật/tắt qua SiteConfig.footer.contact.floatingWidget.
 * Hỗ trợ Messenger, Zalo, Hotline, Email. Tự ẩn nếu không có URL nào.
 */
export default function FloatingContact() {
  const config = useSiteConfigStore((s) => s.config);
  const c = (
    config?.footer as
      | {
          contact?: {
            floatingWidget?: boolean;
            messengerUrl?: string;
            zaloUrl?: string;
            phone?: string;
            hotline?: string;
            email?: string;
          };
        }
      | undefined
  )?.contact;
  const [open, setOpen] = useState(false);

  if (!c?.floatingWidget) return null;

  const items: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [];
  if (c.messengerUrl)
    items.push({ label: "Messenger", href: c.messengerUrl, icon: MessageCircle, color: "bg-[#0084ff]" });
  if (c.zaloUrl) items.push({ label: "Zalo", href: c.zaloUrl, icon: MessageCircle, color: "bg-[#0068ff]" });
  const tel = c.hotline || c.phone;
  if (tel)
    items.push({ label: "Gọi ngay", href: `tel:${tel.replace(/\s+/g, "")}`, icon: Phone, color: "bg-emerald-500" });
  if (c.email) items.push({ label: "Email", href: `mailto:${c.email}`, icon: Mail, color: "bg-amber-500" });

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" aria-label="Liên hệ nhanh">
      <AnimatePresence>
        {open &&
          items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.a
                key={it.label}
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
                <Icon className="h-5 w-5" />
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

// Re-export Link để tránh tree-shaking nếu cần dùng href nội bộ trong tương lai.
export { Link };
