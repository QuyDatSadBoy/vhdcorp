"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Facebook,
  Youtube,
  Instagram,
  MessageCircle,
  Linkedin,
  Phone,
  Mail,
  MapPin,
  Music2,
  Send,
  ShieldCheck,
  Truck,
  HeadphonesIcon,
  Award,
} from "lucide-react";
import { useSiteConfigStore } from "@/store/site-config.store";

const socialIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  youtube: Youtube,
  instagram: Instagram,
  zalo: MessageCircle,
  linkedin: Linkedin,
  tiktok: Music2,
  telegram: Send,
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
};

const TRUST = [
  { icon: ShieldCheck, label: "Cam kết chất lượng", desc: "Chứng nhận ISO" },
  { icon: Truck, label: "Giao toàn quốc", desc: "B2B/B2C 24h" },
  { icon: HeadphonesIcon, label: "Hỗ trợ 7 ngày", desc: "Tư vấn chuyên gia" },
  { icon: Award, label: "12+ năm uy tín", desc: "850+ đối tác" },
];

export default function Footer() {
  const config = useSiteConfigStore((s) => s.config);
  const [logoError, setLogoError] = useState(false);
  const footer = config?.footer;
  const brand = config?.brand;

  type LooseCol = { heading?: string; title?: string; links: { label: string; href: string }[] };
  type LooseSocial = { platform: string; url: string };
  const rawCols = (footer as { columns?: LooseCol[] } | undefined)?.columns ?? [];
  const cols: LooseCol[] = rawCols.map((c) => ({
    heading: c.heading ?? c.title ?? "",
    links: c.links ?? [],
  }));
  const rawSocialArr = (footer as { social?: LooseSocial[] } | undefined)?.social;
  const rawSocialMap = (footer as { socials?: Record<string, string> } | undefined)?.socials;
  const socials: LooseSocial[] =
    rawSocialArr ?? Object.entries(rawSocialMap ?? {}).map(([platform, url]) => ({ platform, url }));
  const copyright =
    (footer as { copyright?: string } | undefined)?.copyright ??
    `© ${new Date().getFullYear()} ${brand?.siteName ?? "VHD Corp"}. All rights reserved.`;
  const contact = (
    footer as { contact?: { email?: string; phone?: string; hotline?: string; address?: string } } | undefined
  )?.contact;
  // Hotline ưu tiên, fallback sang phone — ẩn nếu cả hai trống
  const phone = contact?.hotline || contact?.phone || "";

  return (
    <footer className="border-t bg-brand-primary text-white">
      {/* Trust strip */}
      <div className="border-b border-white/10">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-highlight/15 text-brand-highlight">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-xs text-white/60">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main columns */}
      <div className="container mx-auto grid grid-cols-1 gap-10 px-4 py-14 md:grid-cols-12">
        <div className="space-y-5 md:col-span-4">
          <Link href="/" className="flex items-center gap-3" aria-label={brand?.siteName ?? "VHD Corp"}>
            {brand?.logo?.url && !logoError ? (
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white p-1.5">
                <Image
                  src={brand.logo.url}
                  alt={brand.siteName ?? "VHD Corp"}
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              </span>
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-base font-bold text-brand-primary">
                VHD
              </span>
            )}
            <div className="leading-tight">
              <p className="font-heading text-lg font-bold text-white">{brand?.siteName ?? "VHD Corp"}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-highlight">
                {brand?.tagline ?? "KẾT NỐI GIÁ TRỊ - HỢP TÁC VỮNG BỀN"}
              </p>
            </div>
          </Link>
          {/* Mô tả công ty đọc từ SiteConfig — ẩn nếu admin chưa nhập */}
          {footer?.description && (
            <p className="max-w-sm text-sm leading-relaxed text-white/70">{footer.description}</p>
          )}
          {socials.filter((s) => s.url).length > 0 && (
            <div className="flex items-center gap-2">
              {socials
                .filter((s) => s.url)
                .map((s) => {
                  const Icon = socialIcon[s.platform.toLowerCase()] ?? Facebook;
                  return (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.platform}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-highlight hover:text-brand-primary"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
            </div>
          )}
        </div>

        {cols.slice(0, 3).map((col, idx) => (
          <nav key={col.heading || idx} className="space-y-3 md:col-span-2" aria-label={col.heading}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-highlight">{col.heading}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/75 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Cột liên hệ đọc từ SiteConfig — ẩn entry thiếu, ẩn cả cột nếu không có dữ liệu */}
        {(phone || contact?.email || contact?.address) && (
          <div className="space-y-3 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-highlight">Liên hệ</h3>
            <ul className="space-y-2.5 text-sm text-white/75">
              {phone && (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" />
                  <a className="min-w-0 wrap-break-word hover:text-white" href={`tel:${phone.replace(/\s+/g, "")}`}>
                    {phone}
                  </a>
                </li>
              )}
              {contact?.email && (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" />
                  <a className="min-w-0 break-all hover:text-white" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </li>
              )}
              {contact?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight" />
                  <span className="min-w-0 wrap-break-word">{contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/60 md:flex-row">
          <p>{copyright}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/sitemap.xml" className="hover:text-white">
              Sitemap
            </Link>
            <Link href="/about" className="hover:text-white">
              Giới thiệu
            </Link>
            <Link href="/contact" className="hover:text-white">
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
