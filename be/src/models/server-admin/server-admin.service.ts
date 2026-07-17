import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { MailService } from '@service/mail/mail.service';
import {
  cpuPercent,
  isSafeBackupName,
  netRateKBps,
  parseCpuStat,
  parseDf,
  parseMeminfo,
  parseNetDev,
  parseTopProcesses,
  pruneRing,
  type CpuTimes,
  type NetTotals,
} from './metrics.util';

const execFileAsync = promisify(execFile);

/** Service PM2 được phép thao tác — TUYỆT ĐỐI không nhận tên tự do từ client */
const PM2_SERVICES = ['vhd-be', 'vhd-fe', 'vhd-agent'] as const;
type Pm2Name = (typeof PM2_SERVICES)[number];

/** Tác vụ dọn rác cố định — mỗi key là một lệnh viết sẵn, không có ô gõ lệnh */
const CLEANUP_TASKS = [
  'pm2-logs',
  'apt-cache',
  'journal',
  'build-backups',
  'ram-cache',
] as const;
type CleanupTask = (typeof CLEANUP_TASKS)[number];

/** Nguồn log xem được — ánh xạ cố định sang đường dẫn file (không nhận path tự do) */
const HOME = process.env.HOME || '/root';
const LOG_SOURCES: Record<
  string,
  { label: string; file?: string; journal?: boolean }
> = {
  'be-out': {
    label: 'Backend — output',
    file: `${HOME}/.pm2/logs/vhd-be-out.log`,
  },
  'be-err': {
    label: 'Backend — lỗi',
    file: `${HOME}/.pm2/logs/vhd-be-error.log`,
  },
  'fe-out': {
    label: 'Frontend — output',
    file: `${HOME}/.pm2/logs/vhd-fe-out.log`,
  },
  'fe-err': {
    label: 'Frontend — lỗi',
    file: `${HOME}/.pm2/logs/vhd-fe-error.log`,
  },
  'agent-out': {
    label: 'AI Agent — output',
    file: `${HOME}/.pm2/logs/vhd-agent-out.log`,
  },
  'agent-err': {
    label: 'AI Agent — lỗi',
    file: `${HOME}/.pm2/logs/vhd-agent-error.log`,
  },
  'nginx-access': {
    label: 'Nginx — truy cập',
    file: '/var/log/nginx/access.log',
  },
  'nginx-error': { label: 'Nginx — lỗi', file: '/var/log/nginx/error.log' },
  system: { label: 'Hệ điều hành (journalctl)', journal: true },
};

/** Lệnh chẩn đoán CHỈ ĐỌC — whitelist tuyệt đối, không phá hoại, không nhận input tự do */
const DIAGNOSTICS: Record<
  string,
  { label: string; bin: string; args: string[] }
> = {
  disk: { label: 'Dung lượng ổ đĩa (df -h)', bin: 'df', args: ['-h'] },
  mem: { label: 'Bộ nhớ (free -h)', bin: 'free', args: ['-h'] },
  ports: { label: 'Cổng đang mở (ss -tlnp)', bin: 'ss', args: ['-tlnp'] },
  top: {
    label: 'Tiến trình nặng nhất (top)',
    bin: 'top',
    args: ['-bn1', '-o', '%MEM'],
  },
  uptime: { label: 'Tải hệ thống (uptime)', bin: 'uptime', args: [] },
  'nginx-status': {
    label: 'Trạng thái Nginx',
    bin: 'systemctl',
    args: ['status', 'nginx', '--no-pager', '-l'],
  },
  'nginx-test': {
    label: 'Kiểm tra cấu hình Nginx',
    bin: 'nginx',
    args: ['-t'],
  },
  'pm2-status': { label: 'Trạng thái PM2', bin: 'pm2', args: ['status'] },
  firewall: {
    label: 'Tường lửa (UFW)',
    bin: 'ufw',
    args: ['status', 'verbose'],
  },
  fail2ban: {
    label: 'Fail2ban (IP bị chặn)',
    bin: 'fail2ban-client',
    args: ['status', 'sshd'],
  },
  'disk-dirs': {
    label: 'Thư mục nặng nhất',
    bin: 'du',
    args: [
      '-sh',
      '/root/vhdcorp/be',
      '/root/vhdcorp/fe',
      '/root/vhdcorp/agent',
      '/var/log',
      '/root',
    ],
  },
  'ssl-cert': {
    label: 'Hạn chứng chỉ SSL (vhdcorp.com)',
    bin: 'bash',
    args: [
      '-c',
      'echo | openssl s_client -servername vhdcorp.com -connect vhdcorp.com:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates',
    ],
  },
};

export interface Pm2Proc {
  name: string;
  status: string;
  pid: number | null;
  memoryMb: number;
  cpu: number;
  restarts: number;
  uptimeMs: number;
}

/**
 * Quản trị VPS từ trang admin — thiết kế NHẸ nhất có thể:
 * - Số liệu đọc thẳng /proc + `df` khi được hỏi (không daemon ngoài)
 * - Sampler 60s/lần ghi ring-file 7 ngày (~10.080 dòng JSON — vài trăm KB)
 * - Mọi hành động là whitelist; deploy chạy detached qua đúng scripts/deploy.sh
 *   (giữ nguyên smoke test + rollback của pipeline)
 */
@Injectable()
export class ServerAdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerAdminService.name);
  /** Thư mục app gốc (chứa be/, fe/, scripts/) — BE chạy với cwd = <app>/be */
  private readonly appDir = process.env.APP_DIR || path.dirname(process.cwd());
  private readonly storageDir = path.join(process.cwd(), 'storage');
  private readonly historyFile = path.join(
    this.storageDir,
    'metrics-history.jsonl',
  );
  private readonly auditFile = path.join(this.storageDir, 'server-audit.log');
  private readonly deployLog = path.join(this.storageDir, 'deploy-web.log');
  private readonly deployLock = path.join(this.storageDir, 'deploy-web.lock');
  private readonly backupDir = process.env.BACKUP_DIR || '/root';

  /** PATH đầy đủ — BE chạy dưới PM2 có thể thiếu PATH; mọi lệnh nằm ở /usr/bin */
  private readonly execEnv = {
    ...process.env,
    PATH: `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH ?? ''}`,
  };

  private samplerTimer: NodeJS.Timeout | null = null;
  private alertTimer: NodeJS.Timeout | null = null;
  /** Cooldown 6h cho từng loại cảnh báo — không spam mail admin */
  private lastAlertAt = new Map<string, number>();

  constructor(private readonly mail: MailService) {}

  onModuleInit() {
    fs.mkdirSync(this.storageDir, { recursive: true });
    // Sampler 60s — unref() để không giữ process sống khi shutdown
    this.samplerTimer = setInterval(
      () => void this.sampleOnce().catch(() => undefined),
      60_000,
    );
    this.samplerTimer.unref();
    this.alertTimer = setInterval(
      () => void this.checkAlerts().catch(() => undefined),
      5 * 60_000,
    );
    this.alertTimer.unref();
  }

  onModuleDestroy() {
    if (this.samplerTimer) clearInterval(this.samplerTimer);
    if (this.alertTimer) clearInterval(this.alertTimer);
  }

  /* ─── Số liệu realtime ──────────────────────────────────────── */

  private async readCpuTimes(): Promise<CpuTimes> {
    return parseCpuStat(await fsp.readFile('/proc/stat', 'utf8'));
  }

  private async readNet(): Promise<NetTotals> {
    return parseNetDev(await fsp.readFile('/proc/net/dev', 'utf8'));
  }

  private async readDisk() {
    const { stdout } = await execFileAsync('df', ['-kP', '/'], {
      env: this.execEnv,
    });
    return parseDf(stdout);
  }

  async getMetrics() {
    const [memText, cpu1, net1] = await Promise.all([
      fsp.readFile('/proc/meminfo', 'utf8'),
      this.readCpuTimes(),
      this.readNet(),
    ]);
    // 2 mẫu cách 250ms để tính % CPU + tốc độ mạng tức thời
    await new Promise((r) => setTimeout(r, 250));
    const [cpu2, net2] = await Promise.all([
      this.readCpuTimes(),
      this.readNet(),
    ]);
    const net = netRateKBps(net1, net2, 250);
    const mem = parseMeminfo(memText);
    const disk = await this.readDisk().catch(() => ({
      totalKb: 0,
      usedKb: 0,
      pct: 0,
    }));
    return {
      cpu: {
        percent: cpuPercent(cpu1, cpu2),
        loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
        cores: os.cpus().length,
      },
      ram: {
        totalMb: Math.round(mem.totalKb / 1024),
        usedMb: Math.round((mem.totalKb - mem.availableKb) / 1024),
        percent: mem.totalKb
          ? Math.round(((mem.totalKb - mem.availableKb) / mem.totalKb) * 1000) /
            10
          : 0,
      },
      swap: {
        totalMb: Math.round(mem.swapTotalKb / 1024),
        usedMb: Math.round((mem.swapTotalKb - mem.swapFreeKb) / 1024),
      },
      disk: {
        totalGb: Math.round((disk.totalKb / 1024 / 1024) * 10) / 10,
        usedGb: Math.round((disk.usedKb / 1024 / 1024) * 10) / 10,
        percent: disk.pct,
      },
      network: { rxKBps: net.rxKBps, txKBps: net.txKBps },
      uptimeSec: Math.round(os.uptime()),
      services: await this.pm2List(),
    };
  }

  private async pm2List(): Promise<Pm2Proc[]> {
    try {
      const { stdout } = await execFileAsync('pm2', ['jlist'], {
        maxBuffer: 8 * 1024 * 1024,
        env: this.execEnv,
      });
      const raw = JSON.parse(stdout) as Array<{
        name: string;
        pid: number;
        pm2_env: { status: string; restart_time: number; pm_uptime: number };
        monit: { memory: number; cpu: number };
      }>;
      return raw
        .filter((p) => (PM2_SERVICES as readonly string[]).includes(p.name))
        .map((p) => ({
          name: p.name,
          status: p.pm2_env.status,
          pid: p.pid || null,
          memoryMb: Math.round((p.monit?.memory ?? 0) / 1024 / 1024),
          cpu: p.monit?.cpu ?? 0,
          restarts: p.pm2_env.restart_time ?? 0,
          uptimeMs: p.pm2_env.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
        }));
    } catch {
      return []; // môi trường dev không có pm2 — trang vẫn hiện số liệu máy
    }
  }

  /* ─── Lịch sử 7 ngày (sampler) ──────────────────────────────── */

  private async sampleOnce() {
    const mem = parseMeminfo(await fsp.readFile('/proc/meminfo', 'utf8'));
    const disk = await this.readDisk().catch(() => ({
      totalKb: 0,
      usedKb: 0,
      pct: 0,
    }));
    const load1 = os.loadavg()[0];
    const sample = {
      t: Date.now(),
      cpu: Math.round((load1 / os.cpus().length) * 1000) / 10, // load/core ≈ % bận
      ram: mem.totalKb
        ? Math.round(((mem.totalKb - mem.availableKb) / mem.totalKb) * 1000) /
          10
        : 0,
      disk: disk.pct,
    };
    await fsp.appendFile(this.historyFile, JSON.stringify(sample) + '\n');
    // Prune ring khi file phồng — đọc/ghi lại tối đa ~vài trăm KB, 1 lần/vài ngày
    const text = await fsp.readFile(this.historyFile, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    if (lines.length > 10_500)
      await fsp.writeFile(this.historyFile, pruneRing(lines).join('\n') + '\n');
  }

  async getHistory() {
    try {
      const text = await fsp.readFile(this.historyFile, 'utf8');
      return text
        .split('\n')
        .filter(Boolean)
        .map(
          (l) =>
            JSON.parse(l) as {
              t: number;
              cpu: number;
              ram: number;
              disk: number;
            },
        );
    } catch {
      return [];
    }
  }

  /* ─── Cảnh báo mail (cooldown 6h/loại) ──────────────────────── */

  private async checkAlerts() {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;
    const mem = parseMeminfo(await fsp.readFile('/proc/meminfo', 'utf8'));
    const ramPct = mem.totalKb
      ? ((mem.totalKb - mem.availableKb) / mem.totalKb) * 100
      : 0;
    const disk = await this.readDisk().catch(() => ({
      totalKb: 0,
      usedKb: 0,
      pct: 0,
    }));
    const services = await this.pm2List();
    const problems: string[] = [];
    if (ramPct > 90)
      problems.push(`RAM đang ${ramPct.toFixed(1)}% (ngưỡng 90%)`);
    if (disk.pct > 85) problems.push(`Ổ đĩa đang ${disk.pct}% (ngưỡng 85%)`);
    for (const s of services) {
      if (s.status !== 'online')
        problems.push(`Service ${s.name} đang ${s.status}`);
    }
    for (const p of problems) {
      const key =
        p.split(' ')[0] + (p.includes('Service') ? p.split(' ')[1] : '');
      const last = this.lastAlertAt.get(key) ?? 0;
      if (Date.now() - last < 6 * 3600_000) continue;
      this.lastAlertAt.set(key, Date.now());
      await this.mail
        .sendCustomEmail(
          adminEmail,
          `⚠️ [VHD Server] ${p}`,
          `<p>Cảnh báo từ trang quản trị server vhdcorp.com:</p><p><b>${p}</b></p><p>Vào <a href="https://vhdcorp.com/admin/server">Quản trị → Server</a> để xem chi tiết.</p>`,
        )
        .catch((e: unknown) =>
          this.logger.warn(`Gửi mail cảnh báo lỗi: ${String(e)}`),
        );
    }
  }

  /* ─── Version & Deploy ──────────────────────────────────────── */

  async getDeployInfo() {
    const git = async (...args: string[]) =>
      (
        await execFileAsync('git', ['-C', this.appDir, ...args], {
          env: this.execEnv,
        })
      ).stdout.trim();
    const [sha, history] = await Promise.all([
      git('rev-parse', '--short', 'HEAD').catch(() => 'unknown'),
      git(
        'log',
        '-10',
        '--pretty=%h|%ad|%s',
        '--date=format:%d/%m %H:%M',
      ).catch(() => ''),
    ]);
    const deploying = fs.existsSync(this.deployLock);
    return {
      currentSha: sha,
      deploying,
      history: history
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const [h, date, ...msg] = l.split('|');
          return { sha: h, date, message: msg.join('|') };
        }),
    };
  }

  /** Deploy lại bản mới nhất — chạy ĐÚNG scripts/deploy.sh (có smoke + rollback), detached + lock */
  async startDeploy(actor: string) {
    if (fs.existsSync(this.deployLock)) {
      const age = Date.now() - fs.statSync(this.deployLock).mtimeMs;
      if (age < 30 * 60_000)
        throw new ConflictException(
          'Đang có deploy chạy — xem log để theo dõi',
        );
      fs.rmSync(this.deployLock, { force: true }); // lock mồ côi >30 phút → dọn
    }
    fs.writeFileSync(
      this.deployLock,
      `${new Date().toISOString()} by ${actor}\n`,
    );
    await this.audit(actor, 'deploy:start');
    const cmd = `trap 'rm -f "${this.deployLock}"' EXIT; cd "${this.appDir}" && git fetch origin main && git checkout -B main origin/main && git reset --hard origin/main && DEPLOY_BRANCH=main APP_DIR="${this.appDir}" bash scripts/deploy.sh`;
    const child = spawn('bash', ['-lc', cmd], {
      detached: true,
      env: this.execEnv,
      stdio: [
        'ignore',
        fs.openSync(this.deployLog, 'w'),
        fs.openSync(this.deployLog, 'a'),
      ],
    });
    child.unref();
    return {
      started: true,
      message: 'Deploy đã bắt đầu — theo dõi ở phần log bên dưới',
    };
  }

  async getDeployLog(lines = 120) {
    return {
      deploying: fs.existsSync(this.deployLock),
      log: await this.tailFile(this.deployLog, lines),
    };
  }

  /* ─── Services (PM2) ────────────────────────────────────────── */

  private assertPm2Name(name: string): asserts name is Pm2Name {
    if (!(PM2_SERVICES as readonly string[]).includes(name)) {
      throw new BadRequestException('Service không hợp lệ');
    }
  }

  async restartService(name: string, actor: string) {
    this.assertPm2Name(name);
    await this.audit(actor, `restart:${name}`);
    if (name === 'vhd-be') {
      // BE tự restart chính nó → phải detached + delay để kịp trả response
      const child = spawn('bash', ['-lc', 'sleep 1 && pm2 restart vhd-be'], {
        detached: true,
        stdio: 'ignore',
        env: this.execEnv,
      });
      child.unref();
      return { message: 'BE sẽ khởi động lại trong ~2 giây' };
    }
    await execFileAsync('pm2', ['restart', name], { env: this.execEnv });
    return { message: `Đã khởi động lại ${name}` };
  }

  /** Khởi động lại NHIỀU service cùng lúc (gồm cả vhd-be → detached) */
  async restartAll(actor: string) {
    await this.audit(actor, 'restart:all');
    const child = spawn(
      'bash',
      ['-lc', `sleep 1 && pm2 restart ${PM2_SERVICES.join(' ')}`],
      {
        detached: true,
        stdio: 'ignore',
        env: this.execEnv,
      },
    );
    child.unref();
    return { message: 'Đang khởi động lại tất cả service…' };
  }

  /** Chi tiết 1 phiên bản (commit): message đầy đủ + file thay đổi */
  async getCommitDetail(sha: string) {
    if (!/^[0-9a-f]{7,40}$/.test(sha))
      throw new BadRequestException('Mã phiên bản không hợp lệ');
    try {
      const { stdout } = await execFileAsync(
        'git',
        [
          '-C',
          this.appDir,
          'show',
          '--stat',
          '--format=%H%n%an <%ae>%n%ad%n%n%s%n%n%b',
          '--date=format:%d/%m/%Y %H:%M',
          sha,
        ],
        { env: this.execEnv, maxBuffer: 2 * 1024 * 1024 },
      );
      return { sha, detail: stdout.slice(0, 12_000) };
    } catch {
      throw new NotFoundException('Không tìm thấy phiên bản');
    }
  }

  async getServiceLogs(name: string, lines = 100) {
    this.assertPm2Name(name);
    const logDir = path.join(os.homedir(), '.pm2', 'logs');
    const [out, err] = await Promise.all([
      this.tailFile(path.join(logDir, `${name}-out.log`), lines),
      this.tailFile(
        path.join(logDir, `${name}-error.log`),
        Math.min(lines, 50),
      ),
    ]);
    return { out, error: err };
  }

  /** Đọc N dòng cuối file mà không load cả file — buffer co giãn theo số dòng (tối đa 12MB) */
  private async tailFile(file: string, lines: number): Promise<string> {
    try {
      const stat = await fsp.stat(file);
      // ~600 byte/dòng, tối thiểu 256KB, tối đa 12MB (đủ cho 5000 dòng log dài)
      const size = Math.min(
        12 * 1024 * 1024,
        Math.max(256 * 1024, lines * 600),
      );
      const start = Math.max(0, stat.size - size);
      const fh = await fsp.open(file, 'r');
      try {
        const buf = Buffer.alloc(Math.min(size, stat.size));
        await fh.read(buf, 0, buf.length, start);
        const text = buf.toString('utf8');
        return text.split('\n').slice(-lines).join('\n');
      } finally {
        await fh.close();
      }
    } catch {
      return '';
    }
  }

  /* ─── Dọn rác (whitelist) ───────────────────────────────────── */

  async cleanup(task: string, actor: string) {
    if (!(CLEANUP_TASKS as readonly string[]).includes(task)) {
      throw new BadRequestException('Tác vụ không hợp lệ');
    }
    await this.audit(actor, `cleanup:${task}`);
    const before = await this.readDisk().catch(() => ({
      usedKb: 0,
      totalKb: 0,
      pct: 0,
    }));
    try {
      switch (task as CleanupTask) {
        case 'pm2-logs':
          await execFileAsync('pm2', ['flush'], { env: this.execEnv });
          break;
        case 'apt-cache':
          await execFileAsync('apt-get', ['clean'], { env: this.execEnv });
          break;
        case 'journal':
          await execFileAsync('journalctl', ['--vacuum-time=7d'], {
            env: this.execEnv,
          });
          break;
        case 'build-backups':
          await fsp.rm(path.join(this.appDir, 'be', 'dist.bak'), {
            recursive: true,
            force: true,
          });
          await fsp.rm(path.join(this.appDir, 'fe', '.next.bak'), {
            recursive: true,
            force: true,
          });
          break;
        case 'ram-cache':
          // Giải phóng page-cache (an toàn, không mất dữ liệu) — RAM "available" tăng lại
          await execFileAsync(
            'bash',
            [
              '-c',
              'sync && (echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || sysctl -w vm.drop_caches=3)',
            ],
            { env: this.execEnv },
          );
          break;
      }
    } catch (e) {
      throw new BadRequestException(
        `Tác vụ thất bại: ${String(e).slice(0, 200)}`,
      );
    }
    const after = await this.readDisk().catch(() => before);
    const freedMb = Math.max(
      0,
      Math.round((before.usedKb - after.usedKb) / 1024),
    );
    return { task, freedMb, diskPercent: after.pct };
  }

  /* ─── Backup DB ─────────────────────────────────────────────── */

  async listBackups() {
    try {
      const names = await fsp.readdir(this.backupDir);
      const files = await Promise.all(
        names
          .filter((n) => isSafeBackupName(n))
          .map(async (n) => {
            const st = await fsp.stat(path.join(this.backupDir, n));
            return {
              name: n,
              sizeMb: Math.round((st.size / 1024 / 1024) * 100) / 100,
              mtime: st.mtime,
            };
          }),
      );
      return files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch {
      return [];
    }
  }

  async createBackup(actor: string) {
    await this.audit(actor, 'backup:create');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = `vhd_backup_manual_${stamp}.sql.gz`;
    const target = path.join(this.backupDir, name);
    const url = process.env.DATABASE_URL?.replace(/^"|"$/g, '') ?? '';
    // Tên file server tự sinh, URL từ env — không có input người dùng trong lệnh
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'bash',
        [
          '-c',
          `set -o pipefail; pg_dump --dbname="$DB_URL" | gzip > "${target}"`,
        ],
        {
          env: { ...this.execEnv, DB_URL: url },
        },
      );
      child.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`pg_dump exit ${code}`)),
      );
      child.on('error', reject);
    }).catch((e) => {
      throw new BadRequestException(
        `Backup thất bại: ${String(e).slice(0, 200)}`,
      );
    });
    const st = await fsp.stat(target);
    return { name, sizeMb: Math.round((st.size / 1024 / 1024) * 100) / 100 };
  }

  backupPath(name: string): string {
    if (!isSafeBackupName(name))
      throw new BadRequestException('Tên file không hợp lệ');
    const p = path.join(this.backupDir, name);
    if (!fs.existsSync(p)) throw new NotFoundException('Không tìm thấy backup');
    return p;
  }

  async deleteBackup(name: string, actor: string) {
    const p = this.backupPath(name);
    await this.audit(actor, `backup:delete:${name}`);
    await fsp.rm(p);
    return { deleted: name };
  }

  /* ─── Log viewer (đa nguồn, whitelist) ──────────────────────── */

  logSources() {
    return Object.entries(LOG_SOURCES).map(([key, v]) => ({
      key,
      label: v.label,
    }));
  }

  async getLog(source: string, lines: number) {
    const src = LOG_SOURCES[source];
    if (!src) throw new BadRequestException('Nguồn log không hợp lệ');
    const n = Math.min(Math.max(lines || 200, 10), 5000);
    if (src.journal) {
      try {
        const { stdout } = await execFileAsync(
          'journalctl',
          ['-n', String(n), '--no-pager'],
          {
            env: this.execEnv,
            maxBuffer: 8 * 1024 * 1024,
          },
        );
        return { source, log: stdout };
      } catch {
        return { source, log: '(không đọc được journalctl)' };
      }
    }
    return {
      source,
      log: (await this.tailFile(src.file!, n)) || '(log trống)',
    };
  }

  /* ─── Chẩn đoán (whitelist chỉ đọc) ─────────────────────────── */

  diagnosticList() {
    return Object.entries(DIAGNOSTICS).map(([key, v]) => ({
      key,
      label: v.label,
    }));
  }

  async runDiagnostic(key: string) {
    const d = DIAGNOSTICS[key];
    if (!d) throw new BadRequestException('Lệnh chẩn đoán không hợp lệ');
    try {
      const { stdout, stderr } = await execFileAsync(d.bin, d.args, {
        env: this.execEnv,
        maxBuffer: 4 * 1024 * 1024,
        timeout: 15_000,
      });
      // top/nginx-status dài → cắt 120 dòng đầu cho gọn
      const out = (stdout || stderr || '(không có output)')
        .split('\n')
        .slice(0, 120)
        .join('\n');
      return { key, output: out };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return {
        key,
        output: err.stdout || err.stderr || err.message || 'Lệnh thất bại',
      };
    }
  }

  /** Reload nginx an toàn: test cấu hình trước, chỉ reload khi hợp lệ (không downtime) */
  async reloadNginx(actor: string) {
    await this.audit(actor, 'nginx:reload');
    try {
      await execFileAsync('nginx', ['-t'], { env: this.execEnv });
    } catch (e) {
      const err = e as { stderr?: string };
      throw new BadRequestException(
        `Cấu hình Nginx lỗi — KHÔNG reload: ${(err.stderr || '').slice(0, 200)}`,
      );
    }
    await execFileAsync('systemctl', ['reload', 'nginx'], {
      env: this.execEnv,
    });
    return { message: 'Đã reload Nginx (cấu hình hợp lệ)' };
  }

  /**
   * Phân tích bot SEO từ nginx access.log (bot crawl trang FE → chỉ nginx thấy).
   * Đếm Googlebot/Bingbot/khác + lần cuối ghé + URL cuối — theo dõi SEO thực tế.
   */
  async getBotTraffic() {
    const text = await this.tailFile('/var/log/nginx/access.log', 5000);
    const lines = text.split('\n').filter(Boolean);
    const BOTS: { name: string; re: RegExp }[] = [
      {
        name: 'Googlebot',
        re: /googlebot|storebot-google|google-inspectiontool|apis-google|mediapartners-google/i,
      },
      { name: 'Bingbot', re: /bingbot|bingpreview|msnbot/i },
      { name: 'Cốc Cốc', re: /coccocbot/i },
      { name: 'Facebook', re: /facebookexternalhit|facebot/i },
      {
        name: 'Khác',
        re: /bot|crawl|spider|slurp|yandex|duckduckbot|baiduspider|ahrefs|semrush/i,
      },
    ];
    const stats = BOTS.map((b) => ({
      name: b.name,
      count: 0,
      lastSeen: '',
      lastPath: '',
    }));
    let botTotal = 0;
    let humanTotal = 0;
    for (const line of lines) {
      // combined log: … "GET /path HTTP/1.1" status size "ref" "user-agent"
      const uaMatch = line.match(/"([^"]*)"\s*$/);
      const ua = uaMatch ? uaMatch[1] : '';
      const pathMatch = line.match(/"[A-Z]+\s+([^\s]+)\s+HTTP/);
      const path = pathMatch ? pathMatch[1] : '';
      const timeMatch = line.match(/\[([^\]]+)\]/);
      const time = timeMatch ? timeMatch[1] : '';
      const isBot =
        /bot|crawl|spider|slurp|yandex|duckduckbot|baiduspider|facebookexternalhit|ahrefs|semrush|coccoc/i.test(
          ua,
        );
      if (isBot) {
        botTotal++;
        for (let i = 0; i < BOTS.length; i++) {
          if (BOTS[i].re.test(ua)) {
            stats[i].count++;
            stats[i].lastSeen = time;
            stats[i].lastPath = path;
            break;
          }
        }
      } else if (ua) {
        humanTotal++;
      }
    }
    return {
      windowLines: lines.length,
      botTotal,
      humanTotal,
      bots: stats.filter((s) => s.count > 0),
    };
  }

  /** Top tiến trình theo CPU (xem cái nào "ăn" tài nguyên ngay trên web) */
  async getTopProcesses() {
    try {
      const { stdout } = await execFileAsync(
        'ps',
        ['-eo', 'pid,%cpu,%mem,rss,comm', '--sort=-%cpu'],
        { env: this.execEnv, maxBuffer: 4 * 1024 * 1024 },
      );
      return { processes: parseTopProcesses(stdout) };
    } catch {
      return { processes: [] };
    }
  }

  async getDbSize() {
    const url = process.env.DATABASE_URL?.replace(/^"|"$/g, '') ?? '';
    try {
      const { stdout } = await execFileAsync(
        'psql',
        [
          url,
          '-tAc',
          'SELECT pg_size_pretty(pg_database_size(current_database()))',
        ],
        { env: this.execEnv, timeout: 10_000 },
      );
      return { size: stdout.trim() || 'N/A' };
    } catch {
      return { size: 'N/A' };
    }
  }

  /* ─── Audit ─────────────────────────────────────────────────── */

  private async audit(actor: string, action: string) {
    const line = `${new Date().toISOString()} actor=${actor} action=${action}\n`;
    await fsp.appendFile(this.auditFile, line).catch(() => undefined);
  }

  async getAudit(lines = 50) {
    return { log: await this.tailFile(this.auditFile, lines) };
  }
}
