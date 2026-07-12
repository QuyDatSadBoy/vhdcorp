"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Loader2, MessageCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/axios";
import { useSiteConfigStore } from "@/store/site-config.store";

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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(60%_55%_at_85%_30%,color-mix(in_srgb,var(--vhd-color-accent)_45%,transparent)_0%,transparent_70%),radial-gradient(45%_45%_at_15%_80%,color-mix(in_srgb,var(--vhd-color-highlight)_30%,transparent)_0%,transparent_70%)]"
        />
        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <p className="type-eyebrow text-brand-highlight">Liên hệ với VHD Corp</p>
          <motion.h1
            suppressHydrationWarning
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 type-display-lg text-white"
          >
            Cùng nhau xây dựng giá trị bền vững
          </motion.h1>
          <p className="mt-4 type-lead mx-auto max-w-2xl text-white/80">
            Đội ngũ VHD Corp luôn sẵn sàng tư vấn về sản phẩm, báo giá B2B/B2C và lịch giao hàng. Phản hồi trong vòng 24
            giờ.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <h2 className="type-display-md text-foreground">Thông tin liên hệ</h2>
            <p className="text-foreground/65">Chọn kênh phù hợp nhất với bạn — chúng tôi luôn sẵn sàng hỗ trợ.</p>
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
              const data = {
                name: (form.elements.namedItem("name") as HTMLInputElement).value,
                email: (form.elements.namedItem("email") as HTMLInputElement).value,
                subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
                message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
              };
              try {
                await axiosInstance.post("/contact", data);
                toast.success("Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.");
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
              <h2 className="type-display-md text-foreground">Gửi yêu cầu</h2>
              <p className="mt-2 text-sm text-foreground/60">
                Điền đầy đủ thông tin để chúng tôi hỗ trợ bạn nhanh nhất.
              </p>
            </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="subject">Tiêu đề *</Label>
              <Input id="subject" name="subject" required placeholder="VD: Báo giá ống nhựa PVC D21" />
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
