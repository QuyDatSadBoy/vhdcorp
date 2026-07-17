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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  useBackups,
  useCleanup,
  useCreateBackup,
  useDeleteBackup,
  useDeployInfo,
  useDeployLog,
  useRestartService,
  useServerAudit,
  useServerHistory,
  useServerMetrics,
  useStartDeploy,
  serverAdminApi,
  type HistoryPoint,
} from "@/services/server-admin.service";

/* ─── Sparkline SVG tự vẽ — không thêm thư viện chart nào (nhẹ server + client) ─── */
function Sparkline({ points, color, label }: { points: number[]; color: string; label: string }) {
  const w = 260;
  const h = 56;
  if (points.length < 2)
    return <p className="text-xs text-muted-foreground">Chưa đủ dữ liệu — biểu đồ hiện sau ~2 phút</p>;
  const max = Math.max(100, ...points);
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

/** Lấy 1 mẫu / 10 phút cho sparkline (7 ngày ≈ 1008 điểm → mượt mà nhẹ) */
function downsample(history: HistoryPoint[], key: "cpu" | "ram" | "disk"): number[] {
  const step = Math.max(1, Math.floor(history.length / 300));
  return history.filter((_, i) => i % step === 0).map((p) => p[key]);
}

const CLEANUP_LABELS: Record<string, { label: string; desc: string }> = {
  "pm2-logs": { label: "Dọn log services", desc: "Xóa log cũ của BE/FE/Agent (pm2 flush)" },
  "apt-cache": { label: "Dọn cache hệ thống", desc: "Xóa gói cài đặt tạm (apt-get clean)" },
  journal: { label: "Dọn log hệ điều hành", desc: "Giữ 7 ngày gần nhất (journalctl)" },
  "build-backups": { label: "Dọn build backup thừa", desc: "Xóa dist.bak/.next.bak sót lại sau deploy" },
};

export default function ServerAdminPage() {
  const metrics = useServerMetrics();
  const history = useServerHistory();
  const deploy = useDeployInfo();
  const [watchLog, setWatchLog] = useState(false);
  const deployLog = useDeployLog(watchLog || Boolean(deploy.data?.deploying));
  const startDeploy = useStartDeploy();
  const restart = useRestartService();
  const cleanup = useCleanup();
  const backups = useBackups();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const audit = useServerAudit();
  const confirm = useConfirm();
  const [logView, setLogView] = useState<{ name: string; out: string; error: string } | null>(null);

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
            ["cpu", "CPU (load/core)", "#1B3A8C"],
            ["ram", "RAM", "#4FB8E7"],
            ["disk", "Ổ đĩa", "#F5A623"],
          ] as const
        ).map(([key, label, color]) => (
          <Card key={key}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{label} — 7 ngày</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <Sparkline points={downsample(hist, key)} color={color} label={`Biểu đồ ${label} 7 ngày`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Services ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-brand-primary" /> Services (PM2)
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
                <li key={h.sha} className="flex items-baseline gap-2 text-sm">
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
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Muốn quay về bản cũ? Vào GitHub → Revert commit lỗi → merge — pipeline sẽ tự deploy bản đã revert (an toàn
              nhất, có test + rollback).
            </p>
          </div>
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
            <p className="text-[11px] text-muted-foreground">Tự động backup 2:00 sáng hằng ngày, giữ 7 bản gần nhất.</p>
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
