"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Loader2, Activity, Ban, Coins, MessageSquare, X, Plus } from "lucide-react";
import { useChatLimits, useSaveChatLimits, useAgentUsage, type ChatLimits } from "@/services/agent-admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const vnd = (n: number) => n.toLocaleString("vi-VN") + "₫";
const num = (n: number) => n.toLocaleString("vi-VN");

const LIMIT_FIELDS: { key: keyof ChatLimits; label: string; hint: string }[] = [
  { key: "per_ip_per_min", label: "Tối đa / phút (mỗi IP)", hint: "Chặn nhắn dồn dập. Gợi ý 6." },
  { key: "per_ip_per_hour", label: "Tối đa / giờ (mỗi IP)", hint: "Gợi ý 60." },
  { key: "per_ip_per_day", label: "Tối đa / ngày (mỗi IP)", hint: "Gợi ý 200." },
  { key: "global_per_day", label: "Trần TOÀN HỆ THỐNG / ngày", hint: "Trần cứng tổng lượt gọi AI/ngày. Gợi ý 5000." },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-foreground/8 bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className={"h-4 w-4 " + (tone ?? "text-brand-primary")} />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Biểu đồ cột lượt gọi/chặn 14 ngày — CSS thuần, siêu nhẹ (không thư viện chart) */
function MiniBars({ series }: { series: { date: string; requests: number; blocked: number }[] }) {
  const days = series.slice(-14);
  const max = Math.max(1, ...days.map((d) => d.requests + d.blocked));
  return (
    <div className="flex items-end gap-1.5" style={{ height: 96 }}>
      {days.map((d) => {
        const h = ((d.requests + d.blocked) / max) * 100;
        const blockedPct = d.requests + d.blocked > 0 ? (d.blocked / (d.requests + d.blocked)) * 100 : 0;
        return (
          <div
            key={d.date}
            className="group relative flex flex-1 flex-col justify-end"
            title={`${d.date}: ${d.requests} gọi, ${d.blocked} chặn`}
          >
            <div
              className="w-full overflow-hidden rounded-t bg-brand-primary/80"
              style={{ height: `${Math.max(h, 2)}%` }}
            >
              <div className="w-full bg-(--vhd-color-danger)" style={{ height: `${blockedPct}%` }} />
            </div>
            <span className="mt-1 truncate text-center text-[9px] text-muted-foreground">{d.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * AI Management — dashboard đầy đủ trong 1 chỗ: thống kê lượt gọi + token thật +
 * ước tính chi phí, chống spam theo IP + trần toàn cục + kill switch, chặn IP
 * nâng cao, và đơn giá để tính tiền. Đổi cấu hình là hiệu lực NGAY.
 */
export function ChatLimitsCard() {
  const { data: limits, isLoading } = useChatLimits();
  const { data: usage } = useAgentUsage(30);
  const save = useSaveChatLimits();
  const [form, setForm] = useState<ChatLimits | null>(null);
  const [newIp, setNewIp] = useState("");

  useEffect(() => {
    if (limits) setForm(limits);
  }, [limits]);

  const onSave = async () => {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast.success("Đã lưu — hiệu lực ngay.");
    } catch {
      toast.error("Lưu thất bại, thử lại nhé.");
    }
  };

  const addIp = () => {
    const ip = newIp.trim();
    if (!ip || !form) return;
    if (form.blocked_ips.includes(ip)) return toast.info("IP đã có trong danh sách.");
    setForm({ ...form, blocked_ips: [...form.blocked_ips, ip] });
    setNewIp("");
  };
  const removeIp = (ip: string) => form && setForm({ ...form, blocked_ips: form.blocked_ips.filter((x) => x !== ip) });

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-brand-primary" />
          <div>
            <h2 className="text-base font-bold">Quản lý & bảo vệ Trợ lý AI</h2>
            <p className="text-xs text-muted-foreground">
              Thống kê lượt gọi, token, chi phí ước tính + chống spam. Mỗi tin = 1 lượt gọi AI có phí.
            </p>
          </div>
        </div>

        {/* ── THỐNG KÊ ── */}
        {usage && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={MessageSquare}
                label="Lượt gọi hôm nay"
                value={num(usage.today.requests)}
                sub={`${num(usage.today.input_tokens + usage.today.output_tokens)} token`}
              />
              <StatCard
                icon={Ban}
                label="Bị chặn hôm nay"
                value={num(usage.today.blocked)}
                sub="Không tốn tiền"
                tone="text-(--vhd-color-danger)"
              />
              <StatCard
                icon={Coins}
                label="Chi phí hôm nay (ước tính)"
                value={vnd(usage.today.cost_vnd)}
                tone="text-amber-500"
              />
              <StatCard
                icon={Activity}
                label="Tổng 30 ngày"
                value={num(usage.total.requests)}
                sub={`${vnd(usage.total.cost_vnd)} · ${num(usage.total.blocked)} chặn`}
              />
            </div>
            <div className="rounded-xl border border-foreground/8 bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Lượt gọi 14 ngày <span className="text-brand-primary">■</span> gọi thật{" "}
                  <span className="text-(--vhd-color-danger)">■</span> chặn
                </span>
                <span>Tổng token 30 ngày: {num(usage.total.input_tokens + usage.total.output_tokens)}</span>
              </div>
              <MiniBars series={usage.series} />
            </div>
          </>
        )}

        {isLoading || !form ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải cấu hình…
          </div>
        ) : (
          <>
            {/* ── KILL SWITCH ── */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-brand-primary"
              />
              <span className="text-sm">
                <span className="font-semibold">Bật trợ lý AI</span>
                <span className="ml-2 text-xs text-muted-foreground">Tắt để đóng chat toàn bộ khi bị tấn công.</span>
              </span>
            </label>

            {/* ── GIỚI HẠN ── */}
            <div>
              <p className="mb-2 text-sm font-semibold">Giới hạn chống spam</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {LIMIT_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form[f.key] as number}
                      onChange={(e) => setForm({ ...form, [f.key]: Math.max(0, Number(e.target.value)) })}
                    />
                    <p className="text-[11px] text-muted-foreground">{f.hint} 0 = bỏ giới hạn này.</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ĐƠN GIÁ (tính tiền) ── */}
            <div>
              <p className="mb-2 text-sm font-semibold">Đơn giá tính chi phí (VND / 1 triệu token)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Giá token nhập (input)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price_per_1m_input_vnd}
                    onChange={(e) => setForm({ ...form, price_per_1m_input_vnd: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Giá token xuất (output)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price_per_1m_output_vnd}
                    onChange={(e) => setForm({ ...form, price_per_1m_output_vnd: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nhập theo bảng giá Gemini của bạn để ước tính tiền chính xác (đây là ước tính, không phải hóa đơn).
              </p>
            </div>

            {/* ── CHẶN IP NÂNG CAO ── */}
            <div>
              <p className="mb-2 text-sm font-semibold">Chặn IP nâng cao ({form.blocked_ips.length})</p>
              <div className="flex gap-2">
                <Input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Nhập IP cần chặn (vd 1.2.3.4)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIp())}
                />
                <Button type="button" variant="outline" onClick={addIp} className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Chặn
                </Button>
              </div>
              {form.blocked_ips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.blocked_ips.map((ip) => (
                    <span
                      key={ip}
                      className="inline-flex items-center gap-1 rounded-full bg-(--vhd-color-danger)/10 px-2.5 py-1 text-xs font-medium text-(--vhd-color-danger)"
                    >
                      {ip}
                      <button type="button" onClick={() => removeIp(ip)} aria-label={`Bỏ chặn ${ip}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Xem IP nghi vấn trong Search Console/log server rồi dán vào đây. IP thật lấy qua Cloudflare.
              </p>
            </div>

            <Button onClick={onSave} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu tất cả cấu hình
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
