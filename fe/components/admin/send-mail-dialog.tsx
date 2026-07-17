"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useSendMailToUsers } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichEditor } from "@/components/admin/rich-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Thư viện template email — chọn là điền sẵn tiêu đề + nội dung, sửa nhanh rồi gửi.
 * Biến khả dụng: {{name}} (tên người nhận), {{email}}.
 */
const MAIL_TEMPLATES: { key: string; label: string; subject: string; html: string }[] = [
  {
    key: "welcome",
    label: "🎉 Chào mừng thành viên mới",
    subject: "Chào mừng {{name}} đến với VHD Corp!",
    html: `<h1 style="color:#1B3A8C;font-size:22px;margin:0 0 12px;">Chào mừng {{name}}!</h1>
<p style="font-size:15px;line-height:1.7;">Cảm ơn bạn đã tin tưởng và đồng hành cùng <b>VHD Corp</b> — kho tổng vật tư điện lạnh, cơ điện và sản xuất khuôn mẫu, đúc nhựa.</p>
<p style="font-size:15px;line-height:1.7;">Khám phá ngay danh mục sản phẩm với ưu đãi dành riêng cho thành viên mới.</p>`,
  },
  {
    key: "promo",
    label: "🏷️ Thông báo khuyến mãi",
    subject: "Ưu đãi đặc biệt dành cho {{name}} — chỉ trong tuần này!",
    html: `<h1 style="color:#1B3A8C;font-size:22px;margin:0 0 12px;">Ưu đãi đặc biệt cho bạn!</h1>
<p style="font-size:15px;line-height:1.7;">Chào {{name}}, VHD Corp đang có chương trình khuyến mãi hấp dẫn:</p>
<ul style="font-size:15px;line-height:1.9;">
<li>Giảm <b>10%</b> cho mọi đơn hàng trong tuần</li>
<li>Giảm thêm <b>5%</b> cho đơn B2B trên 10 triệu</li>
<li>Miễn phí giao hàng nội thành Hà Nội</li>
</ul>
<p style="font-size:15px;line-height:1.7;">Nhanh tay — chương trình có hạn!</p>`,
  },
  {
    key: "thanks",
    label: "💙 Cảm ơn khách hàng",
    subject: "VHD Corp cảm ơn {{name}} đã đồng hành",
    html: `<h1 style="color:#1B3A8C;font-size:22px;margin:0 0 12px;">Cảm ơn bạn, {{name}}!</h1>
<p style="font-size:15px;line-height:1.7;">Sự tin tưởng của bạn là động lực để VHD Corp không ngừng nâng cao chất lượng sản phẩm và dịch vụ.</p>
<p style="font-size:15px;line-height:1.7;">Nếu cần hỗ trợ bất cứ điều gì, đừng ngần ngại phản hồi email này — đội ngũ VHD luôn sẵn sàng.</p>`,
  },
  {
    key: "maintenance",
    label: "🔧 Thông báo bảo trì hệ thống",
    subject: "Thông báo bảo trì hệ thống VHD Corp",
    html: `<h1 style="color:#1B3A8C;font-size:22px;margin:0 0 12px;">Thông báo bảo trì</h1>
<p style="font-size:15px;line-height:1.7;">Chào {{name}}, website VHD Corp sẽ bảo trì nâng cấp vào <b>[thời gian]</b>, dự kiến trong <b>[X giờ]</b>.</p>
<p style="font-size:15px;line-height:1.7;">Trong thời gian này website có thể gián đoạn. Rất mong bạn thông cảm!</p>`,
  },
  {
    key: "product",
    label: "📦 Giới thiệu sản phẩm mới",
    subject: "Sản phẩm mới vừa lên kệ tại VHD Corp!",
    html: `<h1 style="color:#1B3A8C;font-size:22px;margin:0 0 12px;">Sản phẩm mới đã có mặt!</h1>
<p style="font-size:15px;line-height:1.7;">Chào {{name}}, VHD Corp vừa ra mắt <b>[tên sản phẩm]</b> — [mô tả ngắn].</p>
<p style="font-size:15px;line-height:1.7;">Xem chi tiết và đặt hàng ngay trên website. Số lượng đợt đầu có hạn!</p>`,
  },
  {
    key: "blank",
    label: "✏️ Soạn từ đầu (trống)",
    subject: "",
    html: "",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** id các user được chọn; rỗng → gửi TẤT CẢ user đang hoạt động */
  userIds: number[];
  recipientLabel: string;
}

/** Dialog soạn + gửi email cho user — thư viện template load nhanh, hỗ trợ {{name}}/{{email}} */
export default function SendMailDialog({ open, onOpenChange, userIds, recipientLabel }: Props) {
  const sendMail = useSendMailToUsers();
  const [template, setTemplate] = useState("welcome");
  const [subject, setSubject] = useState(MAIL_TEMPLATES[0].subject);
  const [html, setHtml] = useState(MAIL_TEMPLATES[0].html);

  const applyTemplate = (key: string) => {
    setTemplate(key);
    const tpl = MAIL_TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      setSubject(tpl.subject);
      setHtml(tpl.html);
    }
  };

  const submit = async () => {
    if (subject.trim().length < 3 || html.trim().length < 10) {
      toast.error("Cần tiêu đề (≥3 ký tự) và nội dung (≥10 ký tự)");
      return;
    }
    try {
      const r = await sendMail.mutateAsync({
        userIds: userIds.length > 0 ? userIds : undefined,
        subject: subject.trim(),
        html,
      });
      toast.success(`Đã gửi ${r.sent}/${r.total} email${r.failed ? ` (${r.failed} lỗi)` : ""}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi email thất bại");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Gửi email cho người dùng</DialogTitle>
          <DialogDescription>
            Người nhận: <b>{recipientLabel}</b> · Biến khả dụng: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code> —
            tự thay theo từng người nhận.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Chọn template có sẵn</Label>
            <Select value={template} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAIL_TEMPLATES.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tiêu đề</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tiêu đề email…" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1">
              <Label>Nội dung (soạn thảo trực quan như Word)</Label>
              <RichEditor
                value={html}
                onChange={setHtml}
                placeholder="Soạn nội dung email…"
                uploadFolder="mail"
                className="[&_.ProseMirror]:min-h-48"
              />
            </div>
            <div className="space-y-1">
              <Label>Xem trước email (đúng khung brand VHD)</Label>
              <div className="max-h-105 overflow-y-auto rounded-md border bg-[#eef1f8] p-3">
                <div className="mx-auto max-w-115 overflow-hidden rounded-xl bg-white shadow">
                  {/* Header brand giống hệt email thật */}
                  <div className="flex items-center gap-3 bg-linear-to-br from-[#1B3A8C] to-[#14286A] px-5 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview logo email */}
                    <img
                      src="/images/vhdcorplogo.jpeg"
                      alt=""
                      className="h-11 w-11 rounded-xl bg-white object-contain p-1"
                    />
                    <div>
                      <p className="text-lg font-extrabold text-white">
                        VHD <span className="text-[#F5A623]">Corp</span>
                      </p>
                      <p className="text-[10px] text-[#c3cfeb]">Kết nối giá trị – Hợp tác vững bền</p>
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none px-5 py-4 text-[#1f2937] [&_a]:text-[#1B3A8C]"
                    dangerouslySetInnerHTML={{
                      __html:
                        html.replaceAll("{{name}}", "Nguyễn Văn A").replaceAll("{{email}}", "khach@gmail.com") ||
                        "<p style='color:#9ca3af'>Nội dung email sẽ hiện ở đây…</p>",
                    }}
                  />
                  <div className="border-t bg-[#f5f7fc] px-5 py-3 text-center text-[10px] text-[#8a93a6]">
                    © 2026 VHD Corp — Kết nối giá trị, hợp tác vững bền
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={sendMail.isPending}>
            {sendMail.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Gửi email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
