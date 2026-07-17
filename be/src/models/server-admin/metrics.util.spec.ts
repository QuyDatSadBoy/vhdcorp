import {
  cpuPercent,
  isSafeBackupName,
  parseCpuStat,
  parseDf,
  parseMeminfo,
  pruneRing,
} from './metrics.util';

/** Server admin: parse số liệu hệ thống phải chuẩn — trang quản trị VPS dựa hoàn toàn vào đây. */
describe('metrics.util', () => {
  it('parseMeminfo đọc đúng MemTotal/MemAvailable/Swap', () => {
    const text = [
      'MemTotal:        4030356 kB',
      'MemFree:          211840 kB',
      'MemAvailable:    2542812 kB',
      'SwapTotal:       4194300 kB',
      'SwapFree:        4100000 kB',
    ].join('\n');
    const m = parseMeminfo(text);
    expect(m.totalKb).toBe(4030356);
    expect(m.availableKb).toBe(2542812);
    expect(m.swapTotalKb).toBe(4194300);
    expect(m.swapFreeKb).toBe(4100000);
  });

  it('parseCpuStat + cpuPercent tính đúng % giữa 2 mẫu', () => {
    const prev = parseCpuStat('cpu  100 0 100 700 100 0 0 0 0 0'); // total 1000, idle 800
    const cur = parseCpuStat('cpu  300 0 200 1200 300 0 0 0 0 0'); // total 2000, idle 1500
    // dTotal=1000, dIdle=700 → busy 300/1000 = 30%
    expect(cpuPercent(prev, cur)).toBe(30);
  });

  it('cpuPercent an toàn khi delta = 0', () => {
    const t = parseCpuStat('cpu  1 2 3 4 5 6 7 8');
    expect(cpuPercent(t, t)).toBe(0);
  });

  it('parseDf đọc đúng dung lượng ổ đĩa', () => {
    const text =
      'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/vda1 41152736 20576368 20576368 50% /';
    const d = parseDf(text);
    expect(d.totalKb).toBe(41152736);
    expect(d.pct).toBe(50);
  });

  it('pruneRing giữ đúng số dòng cuối khi vượt ngưỡng', () => {
    const lines = Array.from({ length: 10_600 }, (_, i) => `l${i}`);
    const pruned = pruneRing(lines);
    expect(pruned.length).toBe(10_080);
    expect(pruned[pruned.length - 1]).toBe('l10599');
    // Dưới ngưỡng → giữ nguyên
    expect(pruneRing(['a', 'b']).length).toBe(2);
  });

  it('isSafeBackupName chặn path traversal', () => {
    expect(isSafeBackupName('vhd_backup_2026-07-17.sql.gz')).toBe(true);
    expect(
      isSafeBackupName('vhd_backup_manual_2026-07-17T10-00-00.sql.gz'),
    ).toBe(true);
    expect(isSafeBackupName('../etc/passwd')).toBe(false);
    expect(isSafeBackupName('vhd_backup_../../x.sql.gz')).toBe(false);
    expect(isSafeBackupName('khac.sql.gz')).toBe(false);
    expect(isSafeBackupName('vhd_backup_a/b.sql.gz')).toBe(false);
  });
});
