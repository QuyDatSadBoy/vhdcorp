import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { unwrap } from "@/lib/api";

/* ─── Types khớp BE /server/* ─── */
export interface ServerMetrics {
  cpu: { percent: number; loadAvg: number[]; cores: number };
  ram: { totalMb: number; usedMb: number; percent: number };
  swap: { totalMb: number; usedMb: number };
  disk: { totalGb: number; usedGb: number; percent: number };
  uptimeSec: number;
  services: {
    name: string;
    status: string;
    pid: number | null;
    memoryMb: number;
    cpu: number;
    restarts: number;
    uptimeMs: number;
  }[];
}
export interface HistoryPoint {
  t: number;
  cpu: number;
  ram: number;
  disk: number;
}
export interface DeployInfo {
  currentSha: string;
  deploying: boolean;
  history: { sha: string; date: string; message: string }[];
}
export interface BackupFile {
  name: string;
  sizeMb: number;
  mtime: string;
}

export const serverKeys = {
  metrics: ["server", "metrics"] as const,
  history: ["server", "history"] as const,
  deploy: ["server", "deploy"] as const,
  deployLog: ["server", "deploy-log"] as const,
  backups: ["server", "backups"] as const,
  audit: ["server", "audit"] as const,
};

const api = {
  metrics: () => axios.get<{ data: ServerMetrics }>("/server/metrics").then(unwrap),
  history: () => axios.get<{ data: HistoryPoint[] }>("/server/history").then(unwrap),
  deployInfo: () => axios.get<{ data: DeployInfo }>("/server/deploy").then(unwrap),
  deployLog: () => axios.get<{ data: { deploying: boolean; log: string } }>("/server/deploy/log").then(unwrap),
  startDeploy: () => axios.post<{ data: { message: string } }>("/server/deploy").then(unwrap),
  restart: (name: string) => axios.post<{ data: { message: string } }>(`/server/services/${name}/restart`).then(unwrap),
  serviceLogs: (name: string) =>
    axios.get<{ data: { out: string; error: string } }>(`/server/services/${name}/logs`).then(unwrap),
  cleanup: (task: string) =>
    axios
      .post<{ data: { task: string; freedMb: number; diskPercent: number } }>(`/server/cleanup/${task}`)
      .then(unwrap),
  backups: () => axios.get<{ data: BackupFile[] }>("/server/backups").then(unwrap),
  downloadBackup: (name: string) =>
    axios.get(`/server/backups/${encodeURIComponent(name)}`, { responseType: "blob" }).then((r) => r.data as Blob),
  createBackup: () => axios.post<{ data: { name: string; sizeMb: number } }>("/server/backups").then(unwrap),
  deleteBackup: (name: string) => axios.delete(`/server/backups/${encodeURIComponent(name)}`).then(() => undefined),
  audit: () => axios.get<{ data: { log: string } }>("/server/audit").then(unwrap),
};

export const serverAdminApi = api;

/** Số liệu realtime — tự refresh 10s khi trang đang mở */
export function useServerMetrics() {
  return useQuery({ queryKey: serverKeys.metrics, queryFn: api.metrics, refetchInterval: 10_000 });
}

export function useServerHistory() {
  return useQuery({ queryKey: serverKeys.history, queryFn: api.history, refetchInterval: 5 * 60_000 });
}

export function useDeployInfo() {
  return useQuery({ queryKey: serverKeys.deploy, queryFn: api.deployInfo, refetchInterval: 30_000 });
}

/** Log deploy — poll 3s khi đang deploy để theo dõi trực tiếp */
export function useDeployLog(enabled: boolean) {
  return useQuery({
    queryKey: serverKeys.deployLog,
    queryFn: api.deployLog,
    enabled,
    refetchInterval: (q) => (q.state.data?.deploying ? 3_000 : false),
  });
}

export function useStartDeploy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.startDeploy,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serverKeys.deploy });
      void qc.invalidateQueries({ queryKey: serverKeys.deployLog });
    },
  });
}

export function useRestartService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.restart,
    onSuccess: () => void qc.invalidateQueries({ queryKey: serverKeys.metrics }),
  });
}

export function useCleanup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.cleanup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: serverKeys.metrics }),
  });
}

export function useBackups() {
  return useQuery({ queryKey: serverKeys.backups, queryFn: api.backups });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBackup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: serverKeys.backups }),
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBackup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: serverKeys.backups }),
  });
}

export function useServerAudit() {
  return useQuery({ queryKey: serverKeys.audit, queryFn: api.audit });
}
