"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type ModelPrice,
} from "@/services/agent-admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Cur = "vnd" | "usd";

/** 2 model đang dùng (chính + dự phòng) — khớp server, dùng làm mặc định nếu API chưa trả. */
const DEFAULT_MODELS = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "gemini-3-flash-preview": { in: 0.5, out: 3 },
  "gemini-3.1-flash-lite": { in: 0.25, out: 1.5 },
};

const num = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtMoney = (usd: number, cur: Cur, rate: number) =>
  cur === "usd" ? "$" + usd.toFixed(usd > 0 && usd < 1 ? 4 : 2) : num(usd * rate) + "₫";
/** "2026-07-20" → "20/07" */
const md = (iso: string) => {
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
};

/**
 * Ô nhập số cho phép XÓA về rỗng (bug cũ: value là number → xóa "0" lại nhảy về 0).
 * Giữ chuỗi nội bộ khi đang gõ; đồng bộ lại từ prop khi mất focus / prop đổi.
 */
function NumberInput({
  value,
  onChange,
  className,
  placeholder,
  step,
  zeroEmpty = false,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  step?: string;
  zeroEmpty?: boolean;
}) {
  const shown = (v: number) => (zeroEmpty && v === 0 ? "" : String(v));
  const [text, setText] = useState(() => shown(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(shown(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, zeroEmpty]);
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      className={className}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(shown(value));
      }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") return onChange(0);
        const n = Number(t);
        if (!Number.isNaN(n)) onChange(Math.max(0, n));
      }}
    />
  );
}

/** Cột SVG có lưới + tooltip — nhẹ, sắc nét; luôn nhãn cột đầu/cuối, tô đậm cột được nhấn. */
function BarChart({
  data,
  label,
  cur,
  rate,
  highlightIndex,
}: {
  data: { key: string; value: number; sub: number; costUsd: number }[];
  label: string;
  cur: Cur;
  rate: number;
  highlightIndex?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);
  const W = 640;
  const H = 148;
  const padX = 6;
  const padTop = 12;
  const n = data.length;
  const bw = (W - padX * 2) / n;
  const step = Math.max(1, Math.round(n / 7));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[520px]" role="img" aria-label={label}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={padTop + (1 - g) * (H - padTop)}
            y2={padTop + (1 - g) * (H - padTop)}
            stroke="currentColor"
            className="text-foreground/8"
            strokeWidth={1}
          />
        ))}
        {hasData && (
          <text x={2} y={padTop - 3} className="fill-muted-foreground text-[9px]">
            {num(max)}
          </text>
        )}
        {data.map((d, i) => {
          const barH = d.value > 0 ? Math.max(3, (d.value / max) * (H - padTop)) : 0;
          const x = padX + i * bw;
          const isHi = i === highlightIndex;
          const showLabel = i === 0 || i === n - 1 || i % step === 0;
          return (
            <g key={d.key + i}>
              <rect
                x={x + bw * 0.18}
                y={H - barH}
                width={Math.max(2, bw * 0.64)}
                height={barH}
                rx={2.5}
                className={
                  isHi ? "fill-brand-highlight" : "fill-brand-primary/70 transition-colors hover:fill-brand-primary"
                }
              >
                <title>{`${d.key}: ${num(d.value)} lượt · ${num(d.sub)} token · ${fmtMoney(d.costUsd, cur, rate)}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x + bw / 2}
                  y={H + 16}
                  textAnchor="middle"
                  className={isHi ? "fill-brand-highlight text-[9px] font-bold" : "fill-muted-foreground text-[9px]"}
                >
                  {d.key}
                </text>
              )}
            </g>
          );
        })}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            Chưa có lượt gọi nào
          </text>
        )}
      </svg>
    </div>
  );
}

const ACCENTS = {
  primary: { icon: "text-brand-primary", chip: "bg-brand-primary/10" },
  amber: { icon: "text-amber-500", chip: "bg-amber-500/10" },
  danger: { icon: "text-(--vhd-color-danger)", chip: "bg-(--vhd-color-danger)/10" },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  sub?: string;
  accent?: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-2xl border border-foreground/8 bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-2">
        <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-lg " + a.chip}>
          <Icon className={"h-4 w-4 " + a.icon} />
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AiDashboard() {
  const { data: limits, isLoading } = useChatLimits();
  const { data: usage } = useAgentUsage(30);
  const { data: topIps } = useTopIps(15);
  const save = useSaveChatLimits();
  const [form, setForm] = useState<ChatLimits | null>(null);
  const [cur, setCur] = useState<Cur>("vnd");
  const [newIp, setNewIp] = useState("");

  // Nạp cấu hình + TỰ ĐIỀN đơn giá mặc định (giá gốc Google) cho đúng 2 model đang dùng.
  useEffect(() => {
    if (!limits) return;
    const models = limits.models?.length ? limits.models : DEFAULT_MODELS;
    const defs = { ...DEFAULT_PRICES, ...(limits.default_model_prices ?? {}) };
    const mp: Record<string, ModelPrice> = {};
    for (const m of models) mp[m] = limits.model_prices?.[m] ?? defs[m] ?? { in: 0, out: 0 };
    setForm({ ...limits, model_prices: mp });
    setCur((limits.currency as Cur) ?? "vnd");
  }, [limits]);

  const rate = form?.usd_to_vnd || usage?.usd_to_vnd || 26000;
  const models = useMemo(() => (form?.models?.length ? form.models : DEFAULT_MODELS), [form?.models]);

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

  const setPrice = (model: string, side: "in" | "out", val: number) => {
    if (!form) return;
    const mp = { ...(form.model_prices ?? {}) };
    mp[model] = { ...(mp[model] ?? { in: 0, out: 0 }), [side]: Math.max(0, val) };
    setForm({ ...form, model_prices: mp });
  };

  const budgetInCur = (usd: number) => (cur === "usd" ? Math.round(usd * 100) / 100 : Math.round(usd * rate));
  const budgetToUsd = (v: number) => (cur === "usd" ? v : v / rate);
  const nowHour = new Date().getHours();

  return (
    <Card>
      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Header + currency toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-primary/10">
              <ShieldAlert className="h-5 w-5 text-brand-primary" />
            </span>
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
                accent="amber"
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
                accent="amber"
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
                accent="danger"
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
                accent="amber"
              />
              <StatCard icon={Ban} label="Bị chặn 30 ngày" value={num(usage.total.blocked)} accent="danger" />
            </div>

            {/* ── BIỂU ĐỒ ── */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-foreground/8 bg-card p-4">
                <p className="mb-3 text-sm font-semibold">
                  Lượt gọi 30 ngày <span className="font-normal text-muted-foreground">(cột cam = hôm nay)</span>
                </p>
                <BarChart
                  cur={cur}
                  rate={rate}
                  label="Lượt gọi theo ngày"
                  highlightIndex={usage.series.length - 1}
                  data={usage.series.map((s) => ({
                    key: md(s.date),
                    value: s.requests,
                    sub: s.input_tokens + s.output_tokens,
                    costUsd: s.cost_usd,
                  }))}
                />
              </div>
              <div className="rounded-2xl border border-foreground/8 bg-card p-4">
                <p className="mb-3 text-sm font-semibold">
                  Lượt gọi theo giờ <span className="font-normal text-muted-foreground">(hôm nay)</span>
                </p>
                <BarChart
                  cur={cur}
                  rate={rate}
                  label="Lượt gọi theo giờ"
                  highlightIndex={nowHour}
                  data={usage.today_hours.map((h) => ({
                    key: String(h.hour).padStart(2, "0") + "h",
                    value: h.requests,
                    sub: h.tokens,
                    costUsd: h.cost_usd,
                  }))}
                />
              </div>
            </div>

            {/* ── THEO MODEL ── */}
            {usage.by_model.length > 0 && (
              <div className="rounded-2xl border border-foreground/8 bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Chi phí theo model (30 ngày)</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Model</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Lượt</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Token vào</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Token ra</th>
                        <th className="py-1.5 text-right font-medium">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.by_model.map((m) => (
                        <tr key={m.model} className="border-b border-foreground/5">
                          <td className="py-1.5 pr-3 font-mono text-xs">{m.model}</td>
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
            <div className="rounded-2xl border border-foreground/8 bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <ShieldBan className="h-4 w-4 text-(--vhd-color-danger)" /> IP hoạt động 24h (tự phát hiện)
              </p>
              {topIps && topIps.ips.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">IP</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Lượt gọi</th>
                        <th className="py-1.5 pr-3 text-right font-medium">Bị chặn</th>
                        <th className="py-1.5 text-right font-medium">Thao tác</th>
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
                              (r.blocked > 0 ? "font-semibold text-(--vhd-color-danger)" : "")
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
          <div className="space-y-5 rounded-2xl border border-foreground/8 bg-muted/20 p-4 sm:p-5">
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
                  <NumberInput
                    zeroEmpty
                    placeholder="Không giới hạn"
                    value={budgetInCur(form.daily_budget_usd)}
                    onChange={(n) => setForm({ ...form, daily_budget_usd: budgetToUsd(n) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngân sách / THÁNG</Label>
                  <NumberInput
                    zeroEmpty
                    placeholder="Không giới hạn"
                    value={budgetInCur(form.monthly_budget_usd)}
                    onChange={(n) => setForm({ ...form, monthly_budget_usd: budgetToUsd(n) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tỷ giá USD → VND</Label>
                  <NumberInput
                    placeholder="26000"
                    value={form.usd_to_vnd}
                    onChange={(n) => setForm({ ...form, usd_to_vnd: n })}
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Để trống = không giới hạn. Ngân sách lưu gốc theo USD; hiển thị theo đơn vị đang chọn.
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
                    <NumberInput
                      zeroEmpty
                      placeholder="Không giới hạn"
                      value={form[k] as number}
                      onChange={(n) => setForm({ ...form, [k]: n })}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Để trống = bỏ giới hạn đó.</p>
            </div>

            {/* Đơn giá model (USD gốc) — chỉ 2 model, tự điền sẵn giá Google */}
            <div>
              <p className="mb-1 text-sm font-semibold">Đơn giá theo model (USD / 1 triệu token — giá gốc Google)</p>
              <p className="mb-2.5 text-[11px] text-muted-foreground">
                2 model tự dự phòng cho nhau — model chính lỗi thì tự chuyển. Giá đã điền sẵn, chỉ sửa khi Google đổi
                giá.
              </p>
              <div className="space-y-2">
                {models.map((model, i) => {
                  const p = form.model_prices?.[model] ?? { in: 0, out: 0 };
                  return (
                    <div
                      key={model}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-foreground/8 bg-card p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{model}</span>
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                            (i === 0 ? "bg-brand-primary/10 text-brand-primary" : "bg-muted text-muted-foreground")
                          }
                        >
                          {i === 0 ? "Chính" : "Dự phòng"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          Vào
                          <NumberInput
                            className="w-24"
                            step="0.01"
                            value={p.in}
                            onChange={(v) => setPrice(model, "in", v)}
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          Ra
                          <NumberInput
                            className="w-24"
                            step="0.01"
                            value={p.out}
                            onChange={(v) => setPrice(model, "out", v)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
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
