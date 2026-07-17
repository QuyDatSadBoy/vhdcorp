"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ClipboardList, Mail, Phone, MapPin, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/axios";
import { useSiteConfigStore } from "@/store/site-config.store";
import { useQuoteStore } from "@/store/quote.store";

type InfoItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
};

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const config = useSiteConfigStore((s) => s.config);
  const contact = config?.footer?.contact;
  // Danh sách sản phẩm "Liên hệ báo giá" khách đã gom — đính kèm vào yêu cầu
  const quoteItems = useQuoteStore((s) => s.items);
  const removeQuote = useQuoteStore((s) => s.remove);
  const clearQuote = useQuoteStore((s) => s.clear);
  // Chữ hero/tiêu đề admin sửa được trong Builder (khối cố định) — fallback nội dung chuẩn
  const fb = config?.fixedBlocks?.contact;

  // Danh sách kênh liên hệ build từ SiteConfig — bỏ entry admin chưa cấu hình
  const info: InfoItem[] = [];
  if (contact?.email) info.push({ icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  const tel = contact?.hotline || contact?.phone;
  if (tel) info.push({ icon: Phone, label: "Hotline", value: tel, href: `tel:${tel.replace(/\s+/g, "")}` });
  if (contact?.address) info.push({ icon: MapPin, label: "Địa chỉ", value: contact.address });
  if (contact?.zaloUrl)
    info.push({ icon: MessageCircle, label: "Zalo", value: "Chat ngay với chúng tôi", href: contact.zaloUrl });

  return (
    <>
      <section className="relative overflow-hidden bg-brand-primary py-20 text-white">
        {fb?.heroImage ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${fb.heroImage})` }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-primary/70" />
          </>
        ) : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(60%_55%_at_85%_30%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent)_0%,transparent_70%),radial-gradient(45%_45%_at_15%_80%,color-mix(in_srgb,var(--vhd-color-highlight)_30%,transparent)_0%,transparent_70%)]"
          />
        )}
        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <p className="type-eyebrow text-brand-highlight">{fb?.eyebrow || "Liên hệ với VHD Corp"}</p>
          <motion.h1
            suppressHydrationWarning
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 type-display-lg text-white"
          >
            {fb?.title || "Cùng nhau xây dựng giá trị bền vững"}
          </motion.h1>
          <p className="mt-4 type-lead mx-auto max-w-2xl text-white/80">
            {fb?.description ||
              "Đội ngũ VHD Corp luôn sẵn sàng tư vấn về sản phẩm, báo giá B2B/B2C và lịch giao hàng. Phản hồi trong vòng 24 giờ."}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <h2 className="type-display-md text-foreground">{fb?.infoHeading || "Thông tin liên hệ"}</h2>
            <p className="text-foreground/65">
              {fb?.infoDescription || "Chọn kênh phù hợp nhất với bạn — chúng tôi luôn sẵn sàng hỗ trợ."}
            </p>
            <div className="mt-6 grid gap-3">
              {info.map((it) => {
                const Icon = it.icon;
                const Wrapper = it.href ? "a" : "div";
                return (
                  <Wrapper
                    key={it.label}
                    {...(it.href
                      ? {
                          href: it.href,
                          target: it.href.startsWith("http") ? "_blank" : undefined,
                          rel: it.href.startsWith("http") ? "noopener noreferrer" : undefined,
                        }
                      : {})}
                    className="group flex items-center gap-4 rounded-2xl border border-foreground/8 bg-card p-5 transition-all hover:border-brand-primary/30 hover:shadow-md"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-(--vhd-color-highlight)/15 text-brand-highlight transition-colors group-hover:bg-brand-primary group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{it.label}</p>
                      <p className="font-semibold text-foreground">{it.value}</p>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              const form = e.target as HTMLFormElement;
              // Đính kèm danh sách sản phẩm cần báo giá vào nội dung (admin nhận mail đầy đủ link)
              const quoteBlock = quoteItems.length
                ? `\n\n— Sản phẩm cần báo giá (${quoteItems.length}) —\n` +
                  quoteItems.map((i) => `• ${i.name} — /products/${i.slug}`).join("\n")
                : "";
              const subjectInput = (form.elements.namedItem("subject") as HTMLInputElement).value;
              const data = {
                name: (form.elements.namedItem("name") as HTMLInputElement).value,
                email: (form.elements.namedItem("email") as HTMLInputElement).value,
                phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
                subject: subjectInput || (quoteItems.length ? "Yêu cầu báo giá sản phẩm" : ""),
                message: (form.elements.namedItem("message") as HTMLTextAreaElement).value + quoteBlock,
              };
              try {
                await axiosInstance.post("/contact", data);
                toast.success(
                  quoteItems.length
                    ? "Đã gửi yêu cầu báo giá! Chúng tôi sẽ gửi báo giá sớm nhất."
                    : "Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất."
                );
                if (quoteItems.length) clearQuote();
                form.reset();
              } catch {
                toast.error("Gửi liên hệ thất bại, vui lòng thử lại.");
              } finally {
                setPending(false);
              }
            }}
            className="space-y-5 rounded-3xl border border-foreground/8 bg-card p-7 shadow-sm md:p-9"
          >
            <div>
              <h2 className="type-display-md text-foreground">{fb?.formHeading || "Gửi yêu cầu"}</h2>
              <p className="mt-2 text-sm text-foreground/60">
                {fb?.formDescription || "Điền đầy đủ thông tin để chúng tôi hỗ trợ bạn nhanh nhất."}
              </p>
            </div>

            {/* Danh sách sản phẩm cần báo giá — khách gom từ các nút "Thêm vào DS báo giá" */}
            {quoteItems.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-(--vhd-color-highlight)/40 bg-(--vhd-color-highlight)/8 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <ClipboardList className="h-4 w-4 text-brand-highlight" />
                  Sản phẩm cần báo giá ({quoteItems.length})
                </p>
                <ul className="space-y-1.5">
                  {quoteItems.map((it) => (
                    <li key={it.productId} className="flex items-center gap-2.5 rounded-lg bg-background/70 p-1.5 pr-2">
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-primary/10 text-[9px] font-bold text-brand-primary">
                          VHD
                        </span>
                      )}
                      <Link
                        href={`/products/${it.slug}`}
                        className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-primary"
                      >
                        {it.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeQuote(it.productId)}
                        aria-label={`Bỏ ${it.name} khỏi danh sách báo giá`}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-brand-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground">
                  Danh sách sẽ được đính kèm vào yêu cầu — chúng tôi báo giá tất cả trong một lần phản hồi.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Họ tên *</Label>
                <Input id="name" name="name" required placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required placeholder="ban@example.com" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input id="phone" name="phone" type="tel" required minLength={8} placeholder="0901 234 567" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Tiêu đề *</Label>
                <Input id="subject" name="subject" required placeholder="VD: Báo giá gas lạnh và ống đồng" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Nội dung *</Label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                required
                placeholder="Mô tả nhu cầu, số lượng, thời gian giao hàng…"
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-full bg-brand-primary text-base font-semibold text-white shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--vhd-color-primary)_60%,transparent)] hover:bg-brand-primary/90"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Gửi liên hệ
            </Button>
            <p className="text-center text-xs text-foreground/55">
              Bằng cách gửi form này, bạn đồng ý với chính sách bảo mật của VHD Corp.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
