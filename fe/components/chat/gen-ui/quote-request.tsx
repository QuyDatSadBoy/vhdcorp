"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Send } from "lucide-react";
import type { ChatProduct } from "@/types/chat";
import { Field, FormShell, SubmittedCard, fieldClass } from "./form-fields";

interface QuoteRequestProps {
  /** Tên sản phẩm gợi ý sẵn (khi khách hỏi báo giá 1 SP cụ thể) */
  product?: string;
  /** Danh sách SP để chọn (nếu có) */
  products?: ChatProduct[];
  onAction: (message: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Form báo giá gen-UI (§9.2): chọn sản phẩm (nếu có list) + số lượng +
 * thông tin liên hệ → gửi câu lệnh cho agent tạo yêu cầu báo giá.
 */
export default function QuoteRequest({ product, products, onAction }: QuoteRequestProps) {
  const options = products?.map((p) => p.name) ?? [];
  const [selected, setSelected] = useState(product ?? options[0] ?? "");
  const [qty, setQty] = useState("1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <SubmittedCard
        title="Đã gửi yêu cầu báo giá ✓"
        lines={[
          `${selected} × ${qty}`,
          `${name} · ${email}${phone ? ` · ${phone}` : ""}`,
          note ? `— ${note}` : "",
        ].filter(Boolean)}
      />
    );
  }

  const validate = () => {
    const next: Record<string, string> = {};
    if (!selected.trim()) next.selected = "Vui lòng chọn/nhập sản phẩm";
    if (!qty.trim() || Number(qty) <= 0) next.qty = "Số lượng phải lớn hơn 0";
    if (!name.trim()) next.name = "Vui lòng nhập họ tên";
    if (!email.trim()) next.email = "Vui lòng nhập email";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Email không hợp lệ";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const parts = [
      `sản phẩm ${selected.trim()}`,
      `số lượng ${qty.trim()}`,
      `tên ${name.trim()}`,
      `email ${email.trim()}`,
      phone.trim() && `SĐT ${phone.trim()}`,
      note.trim() && `ghi chú ${note.trim()}`,
    ].filter(Boolean);
    onAction(`Tạo yêu cầu báo giá: ${parts.join(", ")}`);
    setSubmitted(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <FormShell
        icon={<FileText className="h-4 w-4" aria-hidden />}
        title="Yêu cầu báo giá"
        subtitle="Nhận báo giá tốt nhất theo số lượng"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Sản phẩm" htmlFor="qr-product" required error={errors.selected}>
              {options.length > 0 ? (
                <select
                  id="qr-product"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className={fieldClass}
                >
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="qr-product"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  placeholder="Tên sản phẩm"
                  className={fieldClass}
                />
              )}
            </Field>
            <Field label="Số lượng" htmlFor="qr-qty" required error={errors.qty}>
              <input
                id="qr-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`${fieldClass} sm:w-24`}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Họ và tên" htmlFor="qr-name" required error={errors.name}>
              <input
                id="qr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={fieldClass}
              />
            </Field>
            <Field label="Email" htmlFor="qr-email" required error={errors.email}>
              <input
                id="qr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Số điện thoại" htmlFor="qr-phone">
              <input
                id="qr-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className={fieldClass}
              />
            </Field>
            <Field label="Ghi chú" htmlFor="qr-note">
              <input
                id="qr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thời gian giao, quy cách…"
                className={fieldClass}
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={submit}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-linear-to-br from-brand-primary to-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-95"
          >
            <Send className="h-4 w-4" aria-hidden />
            Gửi yêu cầu báo giá
          </button>
        </div>
      </FormShell>
    </motion.div>
  );
}
