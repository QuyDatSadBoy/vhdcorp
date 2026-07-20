"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useChatLimits, useSaveChatLimits, type ChatLimits } from "@/services/agent-admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FIELDS: { key: keyof Omit<ChatLimits, "enabled">; label: string; hint: string }[] = [
  { key: "per_ip_per_min", label: "Tối đa / phút (mỗi IP)", hint: "Chặn nhắn dồn dập. Gợi ý 6." },
  { key: "per_ip_per_hour", label: "Tối đa / giờ (mỗi IP)", hint: "Gợi ý 60." },
  { key: "per_ip_per_day", label: "Tối đa / ngày (mỗi IP)", hint: "Gợi ý 200." },
  {
    key: "global_per_day",
    label: "Trần TOÀN HỆ THỐNG / ngày",
    hint: "Trần cứng tổng lượt gọi AI cả web/ngày — chống mất tiền khi bị tấn công. Gợi ý 5000.",
  },
];

/**
 * Cấu hình chống spam chat AI — bảo vệ chi phí API (mỗi tin = 1 lần gọi Gemini
 * tốn phí). Đổi là hiệu lực NGAY, không cần deploy. Đặt 0 = tắt giới hạn đó.
 */
export function ChatLimitsCard() {
  const { data, isLoading } = useChatLimits();
  const save = useSaveChatLimits();
  const [form, setForm] = useState<ChatLimits | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSave = async () => {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast.success("Đã lưu cấu hình chống spam — hiệu lực ngay.");
    } catch {
      toast.error("Lưu thất bại, thử lại nhé.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-brand-primary" />
          <div>
            <h2 className="text-base font-bold">Chống spam chat AI (bảo vệ chi phí)</h2>
            <p className="text-xs text-muted-foreground">
              Mỗi tin nhắn tốn 1 lượt gọi AI có phí. Giới hạn theo IP + trần toàn hệ thống. Đổi là áp dụng ngay.
            </p>
          </div>
        </div>

        {isLoading || !form ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <>
            {/* Kill switch */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-brand-primary"
              />
              <span className="text-sm">
                <span className="font-semibold">Bật trợ lý AI</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  Tắt để đóng chat toàn bộ khi bị tấn công (khách thấy lời nhắn liên hệ hotline).
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: Math.max(0, Number(e.target.value)) })}
                  />
                  <p className="text-[11px] text-muted-foreground">{f.hint} Đặt 0 = bỏ giới hạn này.</p>
                </div>
              ))}
            </div>

            <Button onClick={onSave} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu cấu hình
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
