/**
 * Hàm thuần parse số liệu hệ thống — tách riêng để unit test không cần server thật.
 * Nguồn: /proc/meminfo, /proc/stat (Linux), output `df -kP`.
 */

export interface MemInfo {
  totalKb: number;
  availableKb: number;
  swapTotalKb: number;
  swapFreeKb: number;
}

export function parseMeminfo(text: string): MemInfo {
  const get = (key: string): number => {
    const m = text.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
    return m ? Number(m[1]) : 0;
  };
  return {
    totalKb: get('MemTotal'),
    availableKb: get('MemAvailable'),
    swapTotalKb: get('SwapTotal'),
    swapFreeKb: get('SwapFree'),
  };
}

export interface CpuTimes {
  idle: number;
  total: number;
}

/** Dòng đầu /proc/stat: `cpu  user nice system idle iowait irq softirq steal ...` */
export function parseCpuStat(text: string): CpuTimes {
  const line = text.split('\n')[0] ?? '';
  const nums = line
    .replace(/^cpu\s+/, '')
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const idle = (nums[3] ?? 0) + (nums[4] ?? 0); // idle + iowait
  const total = nums.reduce((a, b) => a + b, 0);
  return { idle, total };
}

/** % CPU giữa 2 lần đọc /proc/stat — 0..100, an toàn khi delta = 0 */
export function cpuPercent(prev: CpuTimes, cur: CpuTimes): number {
  const dTotal = cur.total - prev.total;
  const dIdle = cur.idle - prev.idle;
  if (dTotal <= 0) return 0;
  return Math.round(((dTotal - dIdle) / dTotal) * 1000) / 10;
}

export interface DiskInfo {
  totalKb: number;
  usedKb: number;
  pct: number;
}

/** Parse output `df -kP /` (dòng 2: fs total used avail pct mount) */
export function parseDf(text: string): DiskInfo {
  const line = text.trim().split('\n')[1] ?? '';
  const parts = line.trim().split(/\s+/);
  const totalKb = Number(parts[1] ?? 0);
  const usedKb = Number(parts[2] ?? 0);
  return {
    totalKb,
    usedKb,
    pct: totalKb > 0 ? Math.round((usedKb / totalKb) * 1000) / 10 : 0,
  };
}

/**
 * Ring file: giữ tối đa `keep` dòng cuối khi vượt `max` dòng
 * (ghi 60s/lần → 7 ngày = 10.080 mẫu; prune khi chạm 10.500).
 */
export function pruneRing(
  lines: string[],
  max = 10_500,
  keep = 10_080,
): string[] {
  if (lines.length <= max) return lines;
  return lines.slice(-keep);
}

/** Tên file backup hợp lệ — chặn path traversal tuyệt đối (chỉ basename đúng pattern) */
export function isSafeBackupName(name: string): boolean {
  return (
    /^vhd_backup_[\w.-]+\.sql\.gz$/.test(name) &&
    !name.includes('/') &&
    !name.includes('..')
  );
}
