"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, UserRound } from "lucide-react";
import { Field, FormShell, SubmittedCard, fieldClass } from "./form-fields";

interface ContactPrefill {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

interface ContactFormProps {
  prefill?: ContactPrefill;
  /** Gửi câu lệnh tự nhiên trở lại agent (HITL) */
  onAction: (message: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Form gen-UI để khách để lại thông tin liên hệ (§9.2). Validate cơ bản →
 * gửi câu lệnh tự nhiên cho agent (tool send_contact_request) để agent
 * xác nhận trong hội thoại (đúng HITL).
 */
export default function ContactForm({ prefill, onAction }: ContactFormProps) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [message, setMessage] = useState(prefill?.message ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <SubmittedCard
        title="Đã gửi thông tin liên hệ ✓"
        lines={[`${name} · ${email}${phone ? ` · ${phone}` : ""}`, message ? `— ${message}` : ""].filter(Boolean)}
      />
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Vui lòng nhập họ tên";
    if (!email.trim()) next.email = "Vui lòng nhập email";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Email không hợp lệ";
    if (!message.trim()) next.message = "Vui lòng nhập nội dung";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const parts = [
      `tên ${name.trim()}`,
      `email ${email.trim()}`,
      phone.trim() && `SĐT ${phone.trim()}`,
      `nội dung ${message.trim()}`,
    ].filter(Boolean);
    onAction(`Gửi liên hệ giúp tôi: ${parts.join(", ")}`);
    setSubmitted(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <FormShell
        icon={<UserRound className="h-4 w-4" aria-hidden />}
        title="Để lại thông tin liên hệ"
        subtitle="VHD Corp sẽ liên hệ tư vấn sớm nhất"
      >
        <div className="space-y-3">
          <Field label="Họ và tên" htmlFor="cf-name" required error={errors.name}>
            <input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email" htmlFor="cf-email" required error={errors.email}>
              <input
                id="cf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                className={fieldClass}
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="cf-phone">
              <input
                id="cf-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Nội dung" htmlFor="cf-message" required error={errors.message}>
            <textarea
              id="cf-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tôi cần tư vấn về…"
              className={`${fieldClass} resize-none`}
            />
          </Field>
          <button
            type="button"
            onClick={submit}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-linear-to-br from-brand-primary to-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-95"
          >
            <Send className="h-4 w-4" aria-hidden />
            Gửi thông tin
          </button>
        </div>
      </FormShell>
    </motion.div>
  );
}
