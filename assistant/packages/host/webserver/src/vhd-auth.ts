/**
 * Cổng đăng nhập cho bản dùng nội bộ VHD Corp.
 *
 * Bản gốc không có xác thực: tài liệu ghi rõ "there is no TLS, auth, or origin
 * policy". Với một mình trên máy cá nhân thì hợp lý, nhưng trợ lý này chạy được
 * lệnh trên máy chủ (bash, run_code) và nhiều người trong công ty dùng chung qua
 * mạng — nên phải có cửa khoá, và khoá phải nằm TRONG ứng dụng chứ không chỉ ở
 * nginx: nginx cấu hình sai một lần là mất luôn máy chủ.
 *
 * Cách làm: phiên lưu ở phía máy chủ (không phải cookie có chữ ký) để thu hồi
 * được ngay và không phải quản lý khoá bí mật. Mật khẩu băm bằng scrypt.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const COOKIE = 'vhd_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 giờ — hết ngày làm việc là phải đăng nhập lại
const SCRYPT_KEYLEN = 64
const MAX_BODY_BYTES = 4096 // form đăng nhập chỉ vài trăm byte; chặn kẻ gửi body khổng lồ
const MAX_SESSIONS = 200

/** Chặn dò mật khẩu: sai 5 lần thì khoá IP đó 15 phút. */
const MAX_FAILS = 5
const LOCKOUT_MS = 15 * 60 * 1000

/** Người dùng đọc từ tệp: { "ten": "salt:hash" } */
type UserFile = Record<string, string>

interface Session {
  user: string
  expiresAt: number
}

interface Attempts {
  fails: number
  lockedUntil: number
}

export interface AuthGate {
  /** Xử lý xong request (đã trả lời) → true; chưa xử lý, cho đi tiếp → false. */
  handle(req: IncomingMessage, res: ServerResponse): Promise<boolean>
  /** Dùng cho WebSocket: có phiên hợp lệ hay không. */
  isAuthed(req: IncomingMessage): boolean
}

/**
 * Băm mật khẩu để ghi vào tệp người dùng. Muối riêng từng người → hai người đặt
 * cùng mật khẩu vẫn ra hai chuỗi khác nhau, không suy ra được nhau.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, SCRYPT_KEYLEN)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

/** So sánh theo thời gian hằng số: không để kẻ dò đoán mật khẩu qua độ trễ. */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':')
  if (saltHex === undefined || keyHex === undefined) return false
  let expected: Buffer
  try {
    expected = Buffer.from(keyHex, 'hex')
  } catch {
    return false
  }
  if (expected.length !== SCRYPT_KEYLEN) return false
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN)
  return timingSafeEqual(actual, expected)
}

function readCookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie
  if (raw === undefined) return undefined
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== name) continue
    return part.slice(eq + 1).trim()
  }
  return undefined
}

/** IP thật khi đứng sau nginx — dùng để đếm lần đăng nhập sai. */
function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : fwd
  if (typeof first === 'string' && first.length > 0) {
    const ip = first.split(',')[0]?.trim()
    if (ip !== undefined && ip.length > 0) return ip
  }
  return req.socket.remoteAddress ?? 'unknown'
}

/** Chỉ gắn cờ Secure khi thật sự đang chạy HTTPS — bật vô điều kiện thì đăng nhập ở máy cá nhân (http) hỏng. */
function overHttps(req: IncomingMessage): boolean {
  const proto = req.headers['x-forwarded-proto']
  const first = Array.isArray(proto) ? proto[0] : proto
  return first === 'https'
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = chunk as Buffer
    size += buf.length
    if (size > MAX_BODY_BYTES) throw new Error('body quá lớn')
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  })
}

/**
 * Trang đăng nhập tự chứa hoàn toàn (CSS nội tuyến, không tải tệp ngoài): người
 * chưa đăng nhập không được thấy BẤT KỲ tệp nào của ứng dụng, kể cả bundle.
 */
function loginPage(error: string | undefined, next: string): string {
  const msg =
    error === undefined
      ? ''
      : `<p class="err" role="alert">${escapeHtml(error)}</p>`
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Đăng nhập · Trợ lý nội bộ VHD Corp</title>
<style>
  :root{--vhd:#1b3a8c;--vhd-2:#4fb8e7;--bg:#f5f7fb;--fg:#101828;--line:#d7dde8}
  @media(prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--line:#283040}}
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:var(--bg);
    color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
  form{width:100%;max-width:360px;background:color-mix(in srgb,var(--bg) 82%,#fff);
    border:1px solid var(--line);border-radius:16px;padding:28px}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:22px}
  .mark{width:34px;height:34px;border-radius:9px;flex:none;
    background:linear-gradient(135deg,var(--vhd),var(--vhd-2));color:#fff;
    display:grid;place-items:center;font-weight:800;font-size:12px;letter-spacing:.4px}
  h1{font-size:17px;margin:0;font-weight:650}
  .sub{font-size:13px;opacity:.65;margin:2px 0 0}
  label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px}
  input{width:100%;padding:11px 12px;font-size:16px;color:var(--fg);
    background:var(--bg);border:1px solid var(--line);border-radius:9px}
  input:focus-visible{outline:2px solid var(--vhd-2);outline-offset:1px;border-color:var(--vhd-2)}
  button{width:100%;margin-top:20px;padding:12px;font-size:15px;font-weight:650;color:#fff;
    background:var(--vhd);border:0;border-radius:9px;cursor:pointer}
  button:hover{background:color-mix(in srgb,var(--vhd) 88%,#000)}
  button:focus-visible{outline:2px solid var(--vhd-2);outline-offset:2px}
  .err{margin:14px 0 0;padding:10px 12px;font-size:13px;border-radius:9px;
    color:#b42318;background:#fef3f2;border:1px solid #fda29b}
  @media(prefers-color-scheme:dark){.err{color:#fda29b;background:#2c1416;border-color:#7a271a}}
</style></head><body>
<form method="post" action="/auth/login">
  <div class="brand"><span class="mark">VHD</span>
    <div><h1>Trợ lý nội bộ</h1><p class="sub">VHD Corp</p></div></div>
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <label for="u">Tên đăng nhập</label>
  <input id="u" name="username" autocomplete="username" autocapitalize="none" required autofocus>
  <label for="p">Mật khẩu</label>
  <input id="p" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Đăng nhập</button>
  ${msg}
</form></body></html>`
}

/**
 * Dựng cổng đăng nhập. Trả undefined khi chưa cấu hình người dùng → chạy y như
 * bản gốc (dùng một mình trên máy cá nhân, chỉ nghe 127.0.0.1).
 *
 * @param usersPath - đường dẫn tệp JSON người dùng (biến môi trường VHD_AUTH_USERS).
 */
export function createAuthGate(usersPath: string | undefined): AuthGate | undefined {
  if (usersPath === undefined || usersPath.trim() === '') return undefined
  let users: UserFile
  try {
    const parsed: unknown = JSON.parse(readFileSync(usersPath, 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('tệp người dùng phải là một đối tượng JSON')
    }
    users = parsed as UserFile
  } catch (error) {
    // Cấu hình auth mà đọc không được thì PHẢI dừng: chạy tiếp là mở cửa cho cả mạng.
    throw new Error(
      `webserver: không đọc được tệp người dùng ${usersPath} — ` +
        (error instanceof Error ? error.message : String(error)),
    )
  }
  if (Object.keys(users).length === 0) {
    throw new Error(`webserver: tệp người dùng ${usersPath} rỗng — chưa ai đăng nhập được`)
  }

  const sessions = new Map<string, Session>()
  const attempts = new Map<string, Attempts>()

  const sweep = (): void => {
    const now = Date.now()
    for (const [token, s] of sessions) if (s.expiresAt <= now) sessions.delete(token)
    for (const [ip, a] of attempts) if (a.lockedUntil <= now && a.fails === 0) attempts.delete(ip)
  }

  const currentSession = (req: IncomingMessage): Session | undefined => {
    const token = readCookie(req, COOKIE)
    if (token === undefined) return undefined
    const s = sessions.get(token)
    if (s === undefined) return undefined
    if (s.expiresAt <= Date.now()) {
      sessions.delete(token)
      return undefined
    }
    return s
  }

  const send = (res: ServerResponse, code: number, html: string): void => {
    res.writeHead(code, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      // Trang đăng nhập không được nhúng trong iframe của người khác (chống lừa bấm)
      'x-frame-options': 'DENY',
      'referrer-policy': 'same-origin',
    })
    res.end(html)
  }

  const redirect = (res: ServerResponse, to: string, cookie?: string): void => {
    const headers: Record<string, string> = { location: to, 'cache-control': 'no-store' }
    if (cookie !== undefined) headers['set-cookie'] = cookie
    res.writeHead(302, headers)
    res.end()
  }

  /** Chỉ nhận đường dẫn nội bộ: chặn chuyển hướng sang tên miền lạ sau khi đăng nhập. */
  const safeNext = (raw: string | undefined): string => {
    if (raw === undefined || !raw.startsWith('/') || raw.startsWith('//')) return '/'
    return raw
  }

  return {
    isAuthed(req) {
      return currentSession(req) !== undefined
    },

    async handle(req, res) {
      sweep()
      const url = new URL(req.url ?? '/', 'http://x')
      const path = url.pathname

      if (path === '/auth/logout') {
        const token = readCookie(req, COOKIE)
        if (token !== undefined) sessions.delete(token)
        redirect(res, '/login', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`)
        return true
      }

      if (path === '/login') {
        if (currentSession(req) !== undefined) {
          redirect(res, '/')
          return true
        }
        send(res, 200, loginPage(undefined, safeNext(url.searchParams.get('next') ?? undefined)))
        return true
      }

      if (path === '/auth/login') {
        if (req.method !== 'POST') {
          res.writeHead(405, { allow: 'POST' })
          res.end()
          return true
        }
        const ip = clientIp(req)
        const now = Date.now()
        const rec = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 }
        if (rec.lockedUntil > now) {
          const mins = Math.ceil((rec.lockedUntil - now) / 60000)
          send(res, 429, loginPage(`Sai quá nhiều lần. Thử lại sau ${mins} phút.`, '/'))
          return true
        }

        let form: URLSearchParams
        try {
          form = new URLSearchParams(await readBody(req))
        } catch {
          send(res, 413, loginPage('Dữ liệu gửi lên không hợp lệ.', '/'))
          return true
        }
        const username = (form.get('username') ?? '').trim()
        const password = form.get('password') ?? ''
        const next = safeNext(form.get('next') ?? undefined)

        const stored = Object.hasOwn(users, username) ? users[username] : undefined
        // Vẫn băm khi không có người dùng đó: nếu bỏ qua, thời gian trả lời nhanh
        // hơn sẽ tiết lộ tên nào tồn tại.
        const ok =
          stored !== undefined
            ? await verifyPassword(password, stored)
            : (await verifyPassword(password, await hashPassword('x')), false)

        if (!ok) {
          const fails = rec.fails + 1
          attempts.set(ip, {
            fails: fails >= MAX_FAILS ? 0 : fails,
            lockedUntil: fails >= MAX_FAILS ? now + LOCKOUT_MS : 0,
          })
          // Không nói "sai mật khẩu" hay "không có tên này" — đừng xác nhận tên nào tồn tại.
          send(res, 401, loginPage('Tên đăng nhập hoặc mật khẩu không đúng.', next))
          return true
        }

        attempts.delete(ip)
        if (sessions.size >= MAX_SESSIONS) {
          // Cắt phiên cũ nhất: chặn kẻ đăng nhập lặp làm phình bộ nhớ.
          let oldest: string | undefined
          let oldestAt = Number.POSITIVE_INFINITY
          for (const [t, s] of sessions) {
            if (s.expiresAt < oldestAt) {
              oldestAt = s.expiresAt
              oldest = t
            }
          }
          if (oldest !== undefined) sessions.delete(oldest)
        }
        const token = randomBytes(32).toString('base64url')
        sessions.set(token, { user: username, expiresAt: now + SESSION_TTL_MS })
        const flags = [
          `${COOKIE}=${token}`,
          'Path=/',
          `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
          'HttpOnly',
          'SameSite=Strict',
        ]
        if (overHttps(req)) flags.push('Secure')
        redirect(res, next, flags.join('; '))
        return true
      }

      if (currentSession(req) !== undefined) return false

      // Chưa đăng nhập: request của trang thì đưa tới /login, còn gọi API thì trả
      // 401 gọn (đưa HTML vào chỗ chờ JSON chỉ làm giao diện báo lỗi khó hiểu).
      const wantsHtml = (req.headers.accept ?? '').includes('text/html')
      if (wantsHtml && (req.method === 'GET' || req.method === 'HEAD')) {
        redirect(res, `/login?next=${encodeURIComponent(path + url.search)}`)
        return true
      }
      res.writeHead(401, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end('{"error":"chua_dang_nhap"}')
      return true
    },
  }
}
