import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { ServerAdminService } from './server-admin.service';

/**
 * Terminal SSH trên web cho ADMIN — WebSocket tại /api/server/terminal.
 *
 * BẢO MẬT (nhiều lớp):
 *  1) Handshake phải có cookie admin_access_token hợp lệ + role ADMIN (như REST admin).
 *  2) Shell KHÔNG mở trực tiếp: chạy `ssh root@127.0.0.1` → sshd của HĐH tự bắt nhập
 *     mật khẩu VPS. Code này không cấp quyền — hệ điều hành xác thực (fail2ban vẫn chặn).
 *     Ép password auth (tắt pubkey) để LUÔN phải gõ mật khẩu.
 *  3) node-pty nạp động (lazy) — nếu module lỗi thì chỉ tính năng này hỏng, BE vẫn sống.
 *  4) Ghi audit mở/đóng phiên; giới hạn số phiên; tự đóng khi rảnh.
 */
const TERMINAL_PATH = '/api/server/terminal';
const MAX_SESSIONS = 3;
const IDLE_MS = 15 * 60 * 1000; // 15 phút không thao tác → đóng

// node-pty là native module — nạp động để lỗi build/ABI không làm sập cả BE.
let ptyMod: typeof import('node-pty') | null | undefined;
function loadPty(): typeof import('node-pty') | null {
  if (ptyMod === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ptyMod = require('node-pty') as typeof import('node-pty');
    } catch {
      ptyMod = null;
    }
  }
  return ptyMod;
}

@Injectable()
export class TerminalGateway
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('TerminalGateway');
  private wss?: WebSocketServer;
  private sessions = 0;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly service: ServerAdminService,
  ) {}

  onApplicationBootstrap() {
    const server = this.adapterHost.httpAdapter?.getHttpServer();
    if (!server) {
      this.logger.warn('Không lấy được HTTP server — terminal tắt');
      return;
    }
    this.wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) =>
      this.handleUpgrade(req, socket, head),
    );
    this.logger.log(`Terminal WebSocket sẵn sàng tại ${TERMINAL_PATH}`);
  }

  onModuleDestroy() {
    this.wss?.close();
  }

  private async handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) {
    const path = (req.url || '').split('?')[0];
    if (path !== TERMINAL_PATH) return; // upgrade cho path khác — bỏ qua

    const reject = (code: number, msg: string) => {
      socket.write(`HTTP/1.1 ${code} ${msg}\r\n\r\n`);
      socket.destroy();
    };

    // 1) Xác thực cookie admin (giống guard REST admin)
    const user = await this.authenticate(req);
    if (!user) return reject(401, 'Unauthorized');
    if (this.sessions >= MAX_SESSIONS) return reject(429, 'Too Many Sessions');

    this.wss!.handleUpgrade(req, socket, head, (client) => {
      this.startSession(client, user.email);
    });
  }

  /** Đọc cookie admin_access_token (đã ký) → verify JWT → phải role ADMIN. */
  private async authenticate(
    req: IncomingMessage,
  ): Promise<{ email: string } | null> {
    try {
      const cookies = parseCookieHeader(req.headers.cookie);
      const raw = cookies['admin_access_token'];
      if (!raw) return null;
      const secret = this.config.get<string>('COOKIE_SECRET') || '';
      const token = cookieParser.signedCookie(raw, secret);
      if (!token) return null;
      const payload = await this.jwt.verifyAsync<{
        email: string;
        role: string;
      }>(token, { secret: this.config.getOrThrow('JWT_ACCESS_SECRET') });
      if (payload.role !== 'ADMIN') return null;
      return { email: payload.email };
    } catch {
      return null;
    }
  }

  private startSession(client: WebSocket, email: string) {
    const pty = loadPty();
    if (!pty) {
      client.send('\r\n[Terminal không khả dụng: node-pty lỗi]\r\n');
      client.close();
      return;
    }

    this.sessions += 1;
    void this.service.recordAudit(email, 'terminal:open');
    this.logger.log(`Terminal mở bởi ${email} (đang mở: ${this.sessions})`);

    // ssh tới chính máy → sshd bắt nhập mật khẩu root; ép password auth.
    const term = pty.spawn(
      'ssh',
      [
        '-tt',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'PubkeyAuthentication=no',
        '-o',
        'PreferredAuthentications=keyboard-interactive,password',
        '-o',
        'ServerAliveInterval=30',
        'root@127.0.0.1',
      ],
      {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || '/root',
        env: process.env as Record<string, string>,
      },
    );

    let idle: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        client.send('\r\n[Đóng phiên do rảnh 15 phút]\r\n');
        term.kill();
      }, IDLE_MS);
    };
    resetIdle();

    term.onData((d) => {
      if (client.readyState === client.OPEN) client.send(d);
    });

    term.onExit(() => {
      clearTimeout(idle);
      if (client.readyState === client.OPEN) client.close();
    });

    client.on('message', (buf) => {
      resetIdle();
      let msg: { t?: string; d?: string; c?: number; r?: number };
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        return;
      }
      if (msg.t === 'i' && typeof msg.d === 'string') term.write(msg.d);
      else if (msg.t === 'r' && msg.c && msg.r) term.resize(msg.c, msg.r);
    });

    const cleanup = () => {
      clearTimeout(idle);
      try {
        term.kill();
      } catch {
        /* đã thoát */
      }
      this.sessions = Math.max(0, this.sessions - 1);
      void this.service.recordAudit(email, 'terminal:close');
      this.logger.log(`Terminal đóng bởi ${email} (còn: ${this.sessions})`);
    };
    client.on('close', cleanup);
    client.on('error', cleanup);
  }
}

/** Parse header Cookie thô → map { tên: giá trị } (đã decode). */
function parseCookieHeader(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
