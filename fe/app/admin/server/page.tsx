"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Cpu,
  Database,
  Download,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCcw,
  Rocket,
  Trash2,
  Clock,
  ScrollText,
  Terminal,
  Stethoscope,
  Wifi,
  ListTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  useBackups,
  useCleanup,
  useCreateBackup,
  useDbSize,
  useDeleteBackup,
  useDeployInfo,
  useDeployLog,
  useDiagnostics,
  useLog,
  useLogSources,
  useRestartService,
  useRestartAll,
  useServerAudit,
  useServerHistory,
  useServerMetrics,
  useStartDeploy,
  useAppMetrics,
  useBotTraffic,
  useTopProcesses,
  serverAdminApi,
  type HistoryPoint,
} from "@/services/server-admin.service";

/* ─── Biểu đồ SVG tương tác (hover xem giá trị) — không thêm thư viện chart ─── */
type ChartPoint = { v: number; label: string };
function MetricChart({
  points,
  color,
  unit = "",
  fixedMax,
}: {
  points: ChartPoint[];
  color: string;
  unit?: string;
  /** Cố định trần trục Y (vd 100 cho %) — bỏ trống thì auto theo đỉnh */
  fixedMax?: number;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const w = 600;
  const h = 90;
  if (points.length < 2)
    return <p className="py-6 text-center text-xs text-muted-foreground">Chưa đủ dữ liệu — biểu đồ hiện sau ~2 phút</p>;
  const max = Math.max(fixedMax ?? 1, ...points.map((p) => p.v));
  const step = w / (points.length - 1);
  const y = (v: number) => h - (v / max) * h;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const active = hi != null ? points[hi] : points[points.length - 1];
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-lg font-bold" style={{ color }}>
          {active.v}
          {unit}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {hi != null ? active.label : "hiện tại"} · đỉnh {Math.round(max)}
          {unit}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full cursor-crosshair"
        style={{ height: 90 }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHi(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * w;
          setHi(Math.max(0, Math.min(points.length - 1, Math.round(x / step))));
        }}
      >
        <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hi != null && (
          <>
            <line
              x1={hi * step}
              y1={0}
              x2={hi * step}
              y2={h}
              stroke={color}
              strokeWidth={1}
              opacity={0.4}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hi * step} cy={y(points[hi].v)} r={3.5} fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

/** Lấy mẫu thưa cho biểu đồ + kèm nhãn thời gian (hover xem được) */
function toSeries(history: HistoryPoint[], key: "cpu" | "ram" | "disk"): ChartPoint[] {
  const step = Math.max(1, Math.floor(history.length / 200));
  return history
    .filter((_, i) => i % step === 0)
    .map((p) => ({
      v: p[key],
      label: new Date(p.t).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
}

function hhmm(t: number): string {
  return new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const CLEANUP_LABELS: Record<string, { label: string; desc: string }> = {
  "pm2-logs": { label: "Dọn log services", desc: "Xóa log cũ của BE/FE/Agent (pm2 flush)" },
  "apt-cache": { label: "Dọn cache hệ thống", desc: "Xóa gói cài đặt tạm (apt-get clean)" },
  journal: { label: "Dọn log hệ điều hành", desc: "Giữ 7 ngày gần nhất (journalctl)" },
  "build-backups": { label: "Dọn build backup thừa", desc: "Xóa dist.bak/.next.bak sót lại sau deploy" },
  "ram-cache": { label: "Giải phóng RAM cache", desc: "Xả page-cache (an toàn) — RAM trống tăng lại" },
};

/** Cheatsheet lệnh SSH — hiện ngay trên trang để admin khỏi tìm lại */
const SSH_COMMANDS: { cmd: string; note: string }[] = [
  { cmd: "ssh root@116.118.6.61", note: "đăng nhập VPS (mật khẩu máy chủ)" },
  { cmd: "pm2 logs vhd-be", note: "log backend realtime (Ctrl+C thoát)" },
  { cmd: "pm2 logs vhd-fe", note: "log frontend realtime" },
  { cmd: "pm2 logs vhd-agent", note: "log AI agent realtime" },
  { cmd: "pm2 logs --lines 500", note: "tất cả service, 500 dòng gần nhất" },
  { cmd: "pm2 monit", note: "dashboard CPU/RAM realtime từng service" },
  { cmd: "pm2 status", note: "bảng trạng thái service" },
  { cmd: "tail -f /var/log/nginx/error.log", note: "log lỗi web realtime" },
  { cmd: "journalctl -n 300 --no-pager", note: "log hệ điều hành" },
  { cmd: "free -h ; df -h ; top", note: "RAM / ổ đĩa / tiến trình" },
  { cmd: "fail2ban-client status sshd", note: "IP đang bị chặn" },
  { cmd: "passwd", note: "đổi mật khẩu root (nên làm sau bàn giao)" },
];

export default function ServerAdminPage() {
  const metrics = useServerMetrics();
  const history = useServerHistory();
  const deploy = useDeployInfo();
  const [watchLog, setWatchLog] = useState(false);
  const deployLog = useDeployLog(watchLog || Boolean(deploy.data?.deploying));
  const startDeploy = useStartDeploy();
  const restart = useRestartService();
  const restartAll = useRestartAll();
  const cleanup = useCleanup();
  const backups = useBackups();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const audit = useServerAudit();
  const dbSize = useDbSize();
  const appMetrics = useAppMetrics();
  const botTraffic = useBotTraffic();
  const topProcs = useTopProcesses();
  const confirm = useConfirm();
  const [logView, setLogView] = useState<{ name: string; out: string; error: string } | null>(null);

  // Log viewer đa nguồn
  const logSources = useLogSources();
  const [logSource, setLogSource] = useState("be-out");
  const [logAuto, setLogAuto] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [logLines, setLogLines] = useState(300);
  const logQ = useLog(logSource, logLines, logAuto);
  const logText = logQ.data?.log ?? "";
  const filteredLog = logFilter.trim()
    ? logText
        .split("\n")
        .filter((l) => l.toLowerCase().includes(logFilter.toLowerCase()))
        .join("\n")
    : logText;

  // Chẩn đoán (whitelist)
  const diagList = useDiagnostics();
  const [diagOut, setDiagOut] = useState<{ label: string; output: string } | null>(null);
  const [diagBusy, setDiagBusy] = useState<string | null>(null);
  // Chi tiết phiên bản (commit)
  const [commitView, setCommitView] = useState<{ sha: string; detail: string } | null>(null);

  const m = metrics.data;
  const hist = history.data ?? [];

  const statCards = m
    ? [
        {
          icon: Cpu,
          label: "CPU",
          value: `${m.cpu.percent}%`,
          sub: `load ${m.cpu.loadAvg[0]} · ${m.cpu.cores} cores`,
          warn: m.cpu.percent > 85,
        },
        {
          icon: MemoryStick,
          label: "RAM",
          value: `${m.ram.percent}%`,
          sub: `${m.ram.usedMb}/${m.ram.totalMb} MB · swap ${m.swap.usedMb} MB`,
          warn: m.ram.percent > 90,
        },
        {
          icon: HardDrive,
          label: "Ổ đĩa",
          value: `${m.disk.percent}%`,
          sub: `${m.disk.usedGb}/${m.disk.totalGb} GB`,
          warn: m.disk.percent > 85,
        },
        {
          icon: Wifi,
          label: "Mạng",
          value: `↓${m.network.rxKBps} KB/s`,
          sub: `↑${m.network.txKBps} KB/s gửi đi`,
          warn: false,
        },
        {
          icon: Clock,
          label: "Uptime",
          value: fmtUptime(m.uptimeSec),
          sub: "thời gian server chạy liên tục",
          warn: false,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Server</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi VPS, dọn rác, backup và deploy — số liệu tự làm mới mỗi 10 giây.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void metrics.refetch()} className="gap-1.5">
          <RefreshCcw className={cn("h-3.5 w-3.5", metrics.isFetching && "animate-spin")} /> Làm mới
        </Button>
      </div>

      {/* ── Số liệu realtime ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label} className={cn(c.warn && "border-red-400/60")}>
            <CardContent className="flex items-center gap-3 p-4">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                  c.warn ? "bg-red-500/10 text-red-500" : "bg-brand-primary/10 text-brand-primary"
                )}
              >
                <c.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="truncate text-xl font-bold">{c.value}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {!m && (
          <Card className="sm:col-span-2 xl:col-span-4">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc số liệu server…
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Biểu đồ 7 ngày ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {(
          [
            ["cpu", "CPU", "#1B3A8C"],
            ["ram", "RAM", "#4FB8E7"],
            ["disk", "Ổ đĩa", "#F5A623"],
          ] as const
        ).map(([key, label, color]) => (
          <Card key={key}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{label} — 7 ngày (%)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <MetricChart points={toSeries(hist, key)} color={color} unit="%" fixedMax={100} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Lưu lượng ứng dụng (API) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-brand-primary" /> Lưu lượng ứng dụng (API)
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              từ lúc khởi động ~{appMetrics.data?.sinceHours ?? 0}h
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Request/phút", value: appMetrics.data?.rpm ?? 0, color: "text-brand-primary" },
              {
                label: "Tổng request",
                value: (appMetrics.data?.total ?? 0).toLocaleString("vi-VN"),
                color: "text-foreground",
              },
              {
                label: "Lỗi 5xx",
                value: appMetrics.data?.serverErr ?? 0,
                color: (appMetrics.data?.serverErr ?? 0) > 0 ? "text-red-500" : "text-foreground",
              },
              { label: "Độ trễ TB", value: `${appMetrics.data?.avgLatencyMs ?? 0}ms`, color: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border p-3">
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Request/phút — 60 phút gần nhất</p>
            <MetricChart
              points={(appMetrics.data?.series ?? []).map((p) => ({ v: p.count, label: hhmm(p.t) }))}
              color="#1B3A8C"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Thành công {(appMetrics.data?.ok ?? 0).toLocaleString("vi-VN")} · Lỗi client 4xx{" "}
            {appMetrics.data?.clientErr ?? 0} · Lỗi server 5xx {appMetrics.data?.serverErr ?? 0} · Tỉ lệ lỗi{" "}
            {appMetrics.data?.errorRate ?? 0}% (không tính request nội bộ của trang này)
          </p>
        </CardContent>
      </Card>

      {/* ── Bot SEO (Googlebot…) từ nginx log ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-brand-primary" /> Bot SEO ghé thăm
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              {botTraffic.data
                ? `${botTraffic.data.botTotal} lượt bot / ${botTraffic.data.humanTotal} người (log gần nhất)`
                : "…"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(botTraffic.data?.bots ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Chưa thấy bot nào trong log gần nhất. Googlebot sẽ ghé sau khi bạn submit sitemap ở Google Search Console.
            </p>
          )}
          {(botTraffic.data?.bots ?? []).map((b) => (
            <div key={b.name} className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm">
              <span className={cn("font-semibold", b.name === "Googlebot" && "text-brand-primary")}>{b.name}</span>
              <span className="text-xs text-muted-foreground">{b.count} lượt</span>
              {b.lastPath && <span className="truncate text-xs text-muted-foreground">· gần nhất: {b.lastPath}</span>}
              {b.lastSeen && <span className="ml-auto text-[11px] text-muted-foreground">{b.lastSeen}</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Tiến trình nặng nhất (xem cái nào "ăn" CPU/RAM) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTree className="h-4 w-4 text-brand-primary" /> Tiến trình nặng nhất
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">tự làm mới 15s</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(topProcs.data?.processes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách tiến trình…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Tiến trình</th>
                    <th className="py-1.5 pr-2 font-medium tabular-nums">PID</th>
                    <th className="w-[30%] py-1.5 pr-2 font-medium">CPU</th>
                    <th className="w-[30%] py-1.5 font-medium">RAM</th>
                  </tr>
                </thead>
                <tbody>
                  {(topProcs.data?.processes ?? []).map((p) => {
                    const cpu = Number(p.cpu) || 0;
                    const mem = Number(p.mem) || 0;
                    const rssMb = Number(p.rssMb) || 0;
                    return (
                      <tr key={p.pid} className="border-b last:border-0">
                        <td className="py-1.5 pr-2 font-medium">{p.name}</td>
                        <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">{p.pid}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-brand-primary"
                                style={{ width: `${Math.min(cpu, 100)}%` }}
                              />
                            </div>
                            <span className="w-12 shrink-0 text-right tabular-nums text-xs">{cpu.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-muted">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(mem, 100)}%` }}
                              />
                            </div>
                            <span className="w-16 shrink-0 text-right tabular-nums text-xs">{rssMb} MB</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Services ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-brand-primary" /> Services (PM2)
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 gap-1 text-xs"
              disabled={restartAll.isPending}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Khởi động lại TẤT CẢ service?",
                    description: "BE + FE + Agent gián đoạn vài giây.",
                  }))
                )
                  return;
                restartAll.mutate(undefined, {
                  onSuccess: (r) => toast.success(r.message),
                  onError: (e) => toast.error(e.message),
                });
              }}
            >
              <RefreshCcw className={cn("h-3 w-3", restartAll.isPending && "animate-spin")} /> Restart tất cả
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(m?.services ?? []).map((s) => (
            <div key={s.name} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  s.status === "online" ? "bg-emerald-500" : "bg-red-500"
                )}
                aria-hidden
              />
              <span className="min-w-24 font-semibold">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {s.status} · {s.memoryMb} MB · CPU {s.cpu}% · restart {s.restarts} lần · chạy{" "}
                {fmtUptime(Math.round(s.uptimeMs / 1000))}
              </span>
              <span className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={async () => {
                    const d = await serverAdminApi.serviceLogs(s.name);
                    setLogView({ name: s.name, ...d });
                  }}
                >
                  <ScrollText className="h-3 w-3" /> Log
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  disabled={restart.isPending}
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: `Khởi động lại ${s.name}?`,
                        description: "Service sẽ gián đoạn vài giây.",
                      }))
                    )
                      return;
                    restart.mutate(s.name, {
                      onSuccess: (r) => toast.success(r.message),
                      onError: (e) => toast.error(e.message),
                    });
                  }}
                >
                  <RefreshCcw className="h-3 w-3" /> Restart
                </Button>
              </span>
            </div>
          ))}
          {m && m.services.length === 0 && (
            <p className="text-sm text-muted-foreground">Không đọc được PM2 (môi trường dev?)</p>
          )}
          {logView && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold">Log {logView.name} (100 dòng cuối)</p>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setLogView(null)}>
                  Đóng
                </Button>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {logView.error && `── LỖI ──\n${logView.error}\n\n`}
                {logView.out || "(trống)"}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Version & Deploy ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-brand-primary" /> Version & Deploy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-bold text-brand-primary">
              Đang chạy: {deploy.data?.currentSha ?? "…"}
            </span>
            {deploy.data?.deploying && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang deploy…
              </span>
            )}
            <Button
              size="sm"
              className="ml-auto gap-1.5"
              disabled={startDeploy.isPending || Boolean(deploy.data?.deploying)}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Deploy lại bản mới nhất?",
                    description: "Chạy đúng pipeline chuẩn: build → smoke test → tự rollback nếu lỗi. Mất ~3-5 phút.",
                  }))
                )
                  return;
                setWatchLog(true);
                startDeploy.mutate(undefined, {
                  onSuccess: (r) => toast.success(r.message),
                  onError: (e) => toast.error(e.message),
                });
              }}
            >
              <Rocket className="h-3.5 w-3.5" /> Deploy lại bản mới nhất
            </Button>
          </div>
          {(watchLog || deploy.data?.deploying) && deployLog.data?.log && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-black/90 p-3 text-[11px] leading-relaxed text-emerald-300">
              {deployLog.data.log}
            </pre>
          )}
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">10 bản gần nhất</p>
            <ul className="space-y-1">
              {(deploy.data?.history ?? []).map((h) => (
                <li key={h.sha}>
                  <button
                    type="button"
                    className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60"
                    title="Xem chi tiết phiên bản"
                    onClick={async () => {
                      try {
                        const d = await serverAdminApi.commitDetail(h.sha);
                        setCommitView(d);
                      } catch {
                        toast.error("Không tải được chi tiết");
                      }
                    }}
                  >
                    <code
                      className={cn(
                        "rounded bg-muted px-1.5 py-0.5 text-xs",
                        h.sha === deploy.data?.currentSha && "bg-emerald-500/15 font-bold text-emerald-700"
                      )}
                    >
                      {h.sha}
                    </code>
                    <span className="text-xs text-muted-foreground">{h.date}</span>
                    <span className="min-w-0 flex-1 truncate">{h.message}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Bấm vào một phiên bản để xem chi tiết (file thay đổi). Muốn quay về bản cũ? GitHub → Revert commit → merge
              — pipeline tự deploy bản đã revert (an toàn nhất, có test + rollback).
            </p>
            {commitView && (
              <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-bold">Chi tiết phiên bản {commitView.sha.slice(0, 7)}</p>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setCommitView(null)}>
                    Đóng
                  </Button>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                  {commitView.detail}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Log Viewer đa nguồn ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-brand-primary" /> Xem log
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={logSource} onValueChange={setLogSource}>
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(logSources.data ?? []).map((s) => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(logLines)} onValueChange={(v) => setLogLines(Number(v))}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[200, 500, 1000, 2000, 5000].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n.toLocaleString("vi-VN")} dòng
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Lọc/tìm trong log…"
                aria-label="Lọc log"
                className="h-8 w-40 rounded-md border bg-transparent px-2.5 text-xs outline-none focus:border-brand-accent"
              />
              <Button
                size="sm"
                variant={logAuto ? "default" : "outline"}
                className="h-8 gap-1 text-xs"
                onClick={() => setLogAuto((v) => !v)}
              >
                <RefreshCcw className={cn("h-3 w-3", logAuto && "animate-spin")} /> Auto 5s
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => void logQ.refetch()}>
                <RefreshCcw className="h-3 w-3" /> Tải lại
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                onClick={() => {
                  const blob = new Blob([logText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${logSource}.log`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-3 w-3" /> Tải về
              </Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all rounded-xl border bg-black/90 p-3 text-[11px] leading-relaxed text-emerald-200/90">
            {logQ.isFetching && !logQ.data ? "Đang tải…" : filteredLog || "(log trống hoặc không khớp bộ lọc)"}
          </pre>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Log ghi ra file trên server: PM2 tại <code className="rounded bg-muted px-1">~/.pm2/logs/</code>, Nginx tại{" "}
            <code className="rounded bg-muted px-1">/var/log/nginx/</code>. Cần xem sâu hơn → dùng SSH (xem mục Chẩn
            đoán bên dưới hoặc các lệnh SSH thường dùng).
          </p>
        </CardContent>
      </Card>

      {/* ── Chẩn đoán (whitelist chỉ đọc) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-brand-primary" /> Chẩn đoán nhanh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(diagList.data ?? []).map((d) => (
              <Button
                key={d.key}
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                disabled={diagBusy !== null}
                onClick={async () => {
                  setDiagBusy(d.key);
                  try {
                    const r = await serverAdminApi.runDiagnostic(d.key);
                    setDiagOut({ label: d.label, output: r.output });
                  } catch {
                    toast.error("Lệnh thất bại");
                  } finally {
                    setDiagBusy(null);
                  }
                }}
              >
                {diagBusy === d.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Terminal className="h-3 w-3" />}
                {d.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs text-amber-700"
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Reload Nginx?",
                    description: "Kiểm tra cấu hình rồi reload (không downtime).",
                  }))
                )
                  return;
                try {
                  const r = await serverAdminApi.reloadNginx();
                  toast.success(r.message);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Reload Nginx thất bại");
                }
              }}
            >
              <RefreshCcw className="h-3 w-3" /> Reload Nginx
            </Button>
          </div>
          {diagOut && (
            <div>
              <p className="mb-1 text-xs font-bold">{diagOut.label}</p>
              <pre className="max-h-80 overflow-auto whitespace-pre rounded-xl border bg-black/90 p-3 text-[11px] leading-relaxed text-emerald-200/90">
                {diagOut.output}
              </pre>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Chỉ chạy các lệnh <b>xem thông tin</b> (không sửa/xóa gì). Cần shell đầy đủ → dùng SSH (xem hướng dẫn trong
            docs/VANHANH.md).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Dọn rác ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-brand-primary" /> Dọn rác
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(CLEANUP_LABELS).map(([task, info]) => (
              <div key={task} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{info.label}</p>
                  <p className="text-[11px] text-muted-foreground">{info.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={cleanup.isPending}
                  onClick={() =>
                    cleanup.mutate(task, {
                      onSuccess: (r) =>
                        toast.success(
                          r.freedMb > 0
                            ? `Đã giải phóng ${r.freedMb} MB — ổ đĩa còn ${r.diskPercent}%`
                            : "Đã dọn xong (không có gì thừa nhiều)"
                        ),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  Dọn
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Backup DB ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-primary" /> Backup dữ liệu
              </span>
              <Button
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={createBackup.isPending}
                onClick={() =>
                  createBackup.mutate(undefined, {
                    onSuccess: (r) => toast.success(`Đã backup: ${r.name} (${r.sizeMb} MB)`),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                {createBackup.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                Backup ngay
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              Tự động backup 2:00 sáng hằng ngày, giữ 7 bản gần nhất. Dung lượng DB hiện tại:{" "}
              <b className="text-foreground">{dbSize.data?.size ?? "…"}</b>
            </p>
            {(backups.data ?? []).map((b) => (
              <div key={b.name} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{b.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{b.sizeMb} MB</span>
                <button
                  type="button"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-brand-primary hover:bg-muted"
                  title="Tải về"
                  aria-label={`Tải ${b.name}`}
                  onClick={async () => {
                    try {
                      // Tải qua axios (kèm cookie + X-Session-Scope admin) rồi lưu file — link <a> thường thiếu header
                      const blob = await serverAdminApi.downloadBackup(b.name);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = b.name;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      toast.error("Tải backup thất bại");
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-red-500 hover:bg-red-500/10"
                  title="Xóa"
                  aria-label={`Xóa ${b.name}`}
                  onClick={async () => {
                    if (!(await confirm({ title: `Xóa backup ${b.name}?`, description: "Không thể hoàn tác." })))
                      return;
                    deleteBackup.mutate(b.name, {
                      onSuccess: () => toast.success("Đã xóa backup"),
                      onError: (e) => toast.error(e.message),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {backups.data?.length === 0 && <p className="text-sm text-muted-foreground">Chưa có backup nào.</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Hướng dẫn lệnh SSH (khỏi phải tìm lại) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4 text-brand-primary" /> Lệnh SSH thường dùng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {SSH_COMMANDS.map((c) => (
            <div key={c.cmd} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <code className="rounded bg-black/90 px-2 py-1 text-[11px] text-emerald-200/90">{c.cmd}</code>
              <span className="text-[11px] text-muted-foreground">— {c.note}</span>
              <button
                type="button"
                className="ml-auto text-[11px] text-brand-primary hover:underline"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.cmd);
                  toast.success("Đã copy lệnh");
                }}
              >
                Copy
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Audit log ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nhật ký thao tác</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-muted-foreground">
            {audit.data?.log || "Chưa có thao tác nào."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
