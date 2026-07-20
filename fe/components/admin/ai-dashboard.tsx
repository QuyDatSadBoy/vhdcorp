"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Loader2,
  Coins,
  MessageSquare,
  Ban,
  Cpu,
  Wallet,
  Plus,
  X,
  ShieldBan,
  TriangleAlert,
} from "lucide-react";
import {
  useChatLimits,
  useSaveChatLimits,
  useAgentUsage,
  useTopIps,
  type ChatLimits,
} from "@/services/agent-admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Cur = "vnd" | "usd";
const num = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtMoney = (usd: number, cur: Cur, rate: number) =>
  cur === "usd" ? "$" + usd.toFixed(usd > 0 && usd < 1 ? 4 : 2) : num(usd * rate) + "₫";

/** Cột SVG có lưới + tooltip — nhẹ, sắc nét, đẹp */
function BarChart({
  data,
  label,
  cur,
  rate,
}: {
  data: { key: string; value: number; sub: number; costUsd: number }[];
  label: string;
  cur: Cur;
  rate: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 640;
  const H = 150;
  const pad = 4;
  const bw = (W - pad * 2) / data.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full min-w-[520px]" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={H - g * H}
            y2={H - g * H}
            stroke="currentColor"
            className="text-foreground/8"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - 6);
          const x = pad + i * bw;
          return (
            <g key={d.key}>
              <rect
                x={x + bw * 0.15}
                y={H - h}
                width={bw * 0.7}
                height={h}
                rx={2}
                className="fill-brand-primary/85 hover:fill-brand-primary transition-colors"
              >
                <title>{`${d.key}: ${num(d.value)} lượt · ${num(d.sub)} token · ${fmtMoney(d.costUsd, cur, rate)}`}</title>
              </rect>
              {i % Math.ceil(data.length / 12) === 0 && (
                <text x={x + bw / 2} y={H + 14} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                  {d.key}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Coins;
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

const KNOWN_MODELS = ["gemini-3-flash-preview", "gemini-3-flash", "gemini-flash-lite-latest", "gemini-2.0-flash"];

export function AiDashboard() {
  const { data: limits, isLoading } = useChatLimits();
  const { data: usage } = useAgentUsage(30);
  const { data: topIps } = useTopIps(15);
  const save = useSaveChatLimits();
  const [form, setForm] = useState<ChatLimits | null>(null);
  const [cur, setCur] = useState<Cur>("vnd");
  const [newIp, setNewIp] = useState("");

  useEffect(() => {
    if (limits) {
      setForm(limits);
      setCur((limits.currency as Cur) ?? "vnd");
    }
  }, [limits]);

  const rate = form?.usd_to_vnd || usage?.usd_to_vnd || 26000;

  const onSave = async () => {
    if (!form) return;
    try {
      await save.mutateAsync({ ...form, currency: cur });
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

  /** Chặn/bỏ chặn nhanh 1 IP từ bảng nghi vấn — lưu ngay */
  const toggleBlockIp = async (ip: string, block: boolean) => {
    if (!form) return;
    const next = block ? [...new Set([...form.blocked_ips, ip])] : form.blocked_ips.filter((x) => x !== ip);
    setForm({ ...form, blocked_ips: next });
    try {
      await save.mutateAsync({ blocked_ips: next });
      toast.success(block ? `Đã chặn ${ip}` : `Đã bỏ chặn ${ip}`);
    } catch {
      toast.error("Không lưu được, thử lại.");
    }
  };

  // Đơn giá theo model: gộp model đã dùng + đã cấu hình + model quen thuộc
  const priceModels = useMemo(() => {
    const set = new Set<string>([
      ...KNOWN_MODELS,
      ...Object.keys(form?.model_prices ?? {}),
      ...(usage?.by_model ?? []).map((m) => m.model),
    ]);
    return [...set];
  }, [form?.model_prices, usage?.by_model]);

  const setPrice = (model: string, side: "in" | "out", val: number) => {
    if (!form) return;
    const mp = { ...(form.model_prices ?? {}) };
    const cur0 = mp[model] ?? { in: 0, out: 0 };
    mp[model] = { ...cur0, [side]: Math.max(0, val) };
    setForm({ ...form, model_prices: mp });
  };

  const budgetInCur = (usd: number) => (cur === "usd" ? usd : Math.round(usd * rate));
  const budgetToUsd = (v: number) => (cur === "usd" ? v : v / rate);

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {/* Header + currency toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand-primary" />
            <div>
              <h2 className="text-base font-bold">Quản lý & chi phí Trợ lý AI</h2>
              <p className="text-xs text-muted-foreground">Theo dõi token · tiền · chống spam · cầu dao ngân sách.</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs font-semibold">
            {(["vnd", "usd"] as Cur[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCur(c)}
                className={
                  "rounded-md px-3 py-1 transition-colors " +
                  (cur === c ? "bg-brand-primary text-white" : "text-muted-foreground hover:text-foreground")
                }
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {!usage ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
          </div>
        ) : (
          <>
            {/* Cảnh báo ngân sách */}
            {form && form.daily_budget_usd > 0 && usage.spend_today_usd >= form.daily_budget_usd * 0.8 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                Chi phí hôm nay {fmtMoney(usage.spend_today_usd, cur, rate)} đã đạt{" "}
                {Math.round((usage.spend_today_usd / form.daily_budget_usd) * 100)}% ngân sách ngày. Vượt 100% chat sẽ
                tự ngắt.
              </div>
            )}

            {/* ── TỔNG QUAN ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={Coins}
                label="Chi phí hôm nay"
                value={fmtMoney(usage.spend_today_usd, cur, rate)}
                sub={
                  form && form.daily_budget_usd > 0
                    ? `Ngân sách ${fmtMoney(form.daily_budget_usd, cur, rate)}`
                    : "Chưa đặt ngân sách"
                }
                tone="text-amber-500"
              />
              <StatCard
                icon={Wallet}
                label="Chi phí tháng này"
                value={fmtMoney(usage.spend_month_usd, cur, rate)}
                sub={
                  form && form.monthly_budget_usd > 0
                    ? `Ngân sách ${fmtMoney(form.monthly_budget_usd, cur, rate)}`
                    : "Chưa đặt ngân sách"
                }
                tone="text-amber-500"
              />
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
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={Cpu}
                label="Token 30 ngày"
                value={num(usage.total.input_tokens + usage.total.output_tokens)}
                sub={`${num(usage.total.input_tokens)} vào · ${num(usage.total.output_tokens)} ra`}
              />
              <StatCard icon={MessageSquare} label="Lượt gọi 30 ngày" value={num(usage.total.requests)} />
              <StatCard
                icon={Coins}
                label="Chi phí 30 ngày"
                value={fmtMoney(usage.total.cost_usd, cur, rate)}
                tone="text-amber-500"
              />
              <StatCard
                icon={Ban}
                label="Bị chặn 30 ngày"
                value={num(usage.total.blocked)}
                tone="text-(--vhd-color-danger)"
              />
            </div>

            {/* ── BIỂU ĐỒ ── */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-foreground/8 bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Lượt gọi 30 ngày</p>
                <BarChart
                  cur={cur}
                  rate={rate}
                  label="Lượt gọi theo ngày"
                  data={usage.series.map((s) => ({
                    key: s.date.slice(5),
                    value: s.requests,
                    sub: s.input_tokens + s.output_tokens,
                    costUsd: s.cost_usd,
                  }))}
                />
              </div>
              <div className="rounded-xl border border-foreground/8 bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Lượt gọi theo giờ (hôm nay)</p>
                <BarChart
                  cur={cur}
                  rate={rate}
                  label="Lượt gọi theo giờ"
                  data={usage.today_hours.map((h) => ({
                    key: String(h.hour).padStart(2, "0"),
                    value: h.requests,
                    sub: h.tokens,
                    costUsd: h.cost_usd,
                  }))}
                />
              </div>
            </div>

            {/* ── THEO MODEL ── */}
            {usage.by_model.length > 0 && (
              <div className="rounded-xl border border-foreground/8 bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Chi phí theo model (30 ngày)</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Model</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Lượt</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Token vào</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Token ra</th>
                        <th className="py-1.5 font-medium text-right">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.by_model.map((m) => (
                        <tr key={m.model} className="border-b border-foreground/5">
                          <td className="py-1.5 pr-3 font-medium">{m.model}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{num(m.requests)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{num(m.input_tokens)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{num(m.output_tokens)}</td>
                          <td className="py-1.5 text-right font-semibold tabular-nums text-amber-600">
                            {fmtMoney(m.cost_usd, cur, rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── IP NGHI VẤN ── */}
            <div className="rounded-xl border border-foreground/8 bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <ShieldBan className="h-4 w-4 text-(--vhd-color-danger)" /> IP hoạt động 24h (tự phát hiện)
              </p>
              {topIps && topIps.ips.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">IP</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Lượt gọi</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Bị chặn</th>
                        <th className="py-1.5 font-medium text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topIps.ips.map((r) => (
                        <tr key={r.ip} className="border-b border-foreground/5">
                          <td className="py-1.5 pr-3 font-mono text-xs">{r.ip}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{num(r.requests)}</td>
                          <td
                            className={
                              "py-1.5 pr-3 text-right tabular-nums " +
                              (r.blocked > 0 ? "text-(--vhd-color-danger) font-semibold" : "")
                            }
                          >
                            {num(r.blocked)}
                          </td>
                          <td className="py-1.5 text-right">
                            {r.is_blocked ? (
                              <button
                                onClick={() => toggleBlockIp(r.ip, false)}
                                className="text-xs font-semibold text-brand-primary hover:underline"
                              >
                                Bỏ chặn
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleBlockIp(r.ip, true)}
                                className="text-xs font-semibold text-(--vhd-color-danger) hover:underline"
                              >
                                Chặn
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-3 text-xs text-muted-foreground">Chưa có hoạt động nào trong 24h qua.</p>
              )}
            </div>
          </>
        )}

        {/* ── CẤU HÌNH ── */}
        {isLoading || !form ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải cấu hình…
          </div>
        ) : (
          <div className="space-y-5 rounded-xl border border-foreground/8 bg-muted/20 p-4">
            <p className="text-sm font-bold">Cấu hình</p>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-brand-primary"
              />
              <span className="text-sm">
                <span className="font-semibold">Bật trợ lý AI</span>
                <span className="ml-2 text-xs text-muted-foreground">Tắt = đóng chat toàn bộ.</span>
              </span>
            </label>

            {/* Cầu dao ngân sách */}
            <div>
              <p className="mb-2 text-sm font-semibold">
                Cầu dao ngân sách ({cur.toUpperCase()}) — vượt là tự ngắt chat
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Ngân sách / NGÀY</Label>
                  <Input
                    type="number"
                    min={0}
                    value={budgetInCur(form.daily_budget_usd)}
                    onChange={(e) =>
                      setForm({ ...form, daily_budget_usd: budgetToUsd(Math.max(0, Number(e.target.value))) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngân sách / THÁNG</Label>
                  <Input
                    type="number"
                    min={0}
                    value={budgetInCur(form.monthly_budget_usd)}
                    onChange={(e) =>
                      setForm({ ...form, monthly_budget_usd: budgetToUsd(Math.max(0, Number(e.target.value))) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tỷ giá USD → VND</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.usd_to_vnd}
                    onChange={(e) => setForm({ ...form, usd_to_vnd: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                0 = không giới hạn. Ngân sách lưu gốc theo USD; hiển thị theo đơn vị đang chọn.
              </p>
            </div>

            {/* Rate limit */}
            <div>
              <p className="mb-2 text-sm font-semibold">Giới hạn chống spam</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["per_ip_per_min", "Tối đa / phút (IP)"],
                    ["per_ip_per_hour", "Tối đa / giờ (IP)"],
                    ["per_ip_per_day", "Tối đa / ngày (IP)"],
                    ["global_per_day", "Trần toàn hệ thống / ngày"],
                  ] as [keyof ChatLimits, string][]
                ).map(([k, label]) => (
                  <div key={k} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form[k] as number}
                      onChange={(e) => setForm({ ...form, [k]: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">0 = bỏ giới hạn đó.</p>
            </div>

            {/* Đơn giá model (USD gốc) */}
            <div>
              <p className="mb-2 text-sm font-semibold">Đơn giá theo model (USD / 1 triệu token — giá gốc)</p>
              <div className="space-y-2">
                {priceModels.map((model) => {
                  const p = form.model_prices?.[model] ?? { in: 0, out: 0 };
                  return (
                    <div key={model} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                      <span className="truncate text-xs font-mono">{model}</span>
                      <Input
                        className="w-28"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="in $"
                        value={p.in || ""}
                        onChange={(e) => setPrice(model, "in", Number(e.target.value))}
                      />
                      <Input
                        className="w-28"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="out $"
                        value={p.out || ""}
                        onChange={(e) => setPrice(model, "out", Number(e.target.value))}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nhập theo bảng giá Google (USD). Bỏ trống = dùng giá mặc định của model.
              </p>
            </div>

            {/* Blocklist thủ công */}
            <div>
              <p className="mb-2 text-sm font-semibold">Chặn IP thủ công ({form.blocked_ips.length})</p>
              <div className="flex gap-2">
                <Input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Nhập IP (vd 1.2.3.4)"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIp())}
                />
                <Button type="button" variant="outline" onClick={addIp} className="shrink-0 gap-1">
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
            </div>

            <Button onClick={onSave} disabled={save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Lưu tất cả cấu hình
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
