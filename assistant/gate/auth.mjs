/**
 * Phiên đăng nhập cho cổng vào trợ lý nội bộ.
 *
 * Xác thực KHÔNG tự làm: đẩy sang `POST /api/auth/admin/login` của BE, dùng đúng
 * bộ tài khoản và luật mật khẩu của trang quản trị. Nhờ vậy thêm/xoá người chỉ
 * làm một chỗ (trang admin), và khoá tài khoản là khoá luôn cả trợ lý.
 *
 * Phiên lưu tại đây (trong bộ nhớ, không phải cookie có chữ ký) để thu hồi được
 * ngay và không phải giữ khoá bí mật nào.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto'

export const COOKIE = 'vhd_gate'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // hết ngày làm việc là đăng nhập lại
const MAX_SESSIONS = 200
const MAX_FAILS = 5
const LOCKOUT_MS = 15 * 60 * 1000

/** Đọc một cookie theo tên. Tự tách vì gate không dùng thư viện ngoài. */
export function readCookie(req, name) {
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

/**
 * IP thật của người dùng — dùng để đếm lần đăng nhập sai.
 *
 * Ưu tiên `X-Real-IP` vì nginx tự GHI ĐÈ header này, khách không giả được. Còn
 * `X-Forwarded-For` thì khách gửi được một phần, nên chỉ dùng khi không có
 * X-Real-IP.
 *
 * Rất quan trọng khi đứng sau Cloudflare: nếu nginx không được cấu hình
 * `real_ip_header CF-Connecting-IP`, mọi người sẽ mang CÙNG một IP của
 * Cloudflare — một người nhập sai 5 lần là khoá cả công ty.
 */
export function clientIp(req) {
  const real = req.headers['x-real-ip']
  const realFirst = Array.isArray(real) ? real[0] : real
  if (typeof realFirst === 'string' && realFirst.trim()) return realFirst.trim()

  const fwd = req.headers['x-forwarded-for']
  const first = Array.isArray(fwd) ? fwd[0] : fwd
  if (typeof first === 'string' && first.length > 0) {
    const ip = first.split(',')[0]?.trim()
    if (ip) return ip
  }
  return req.socket.remoteAddress ?? 'unknown'
}

/** Chỉ gắn Secure khi thật sự chạy HTTPS — bật vô điều kiện thì đăng nhập ở máy cá nhân (http) hỏng. */
export function overHttps(req) {
  const proto = req.headers['x-forwarded-proto']
  const first = Array.isArray(proto) ? proto[0] : proto
  return first === 'https'
}

/** Chỉ nhận đường dẫn nội bộ: chặn chuyển hướng sang tên miền lạ sau khi đăng nhập. */
export function safeNext(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

/**
 * So sánh token phiên theo thời gian hằng số. Map.get() thoát sớm theo nội dung
 * khoá nên tự nó đã lộ chút thông tin thời gian; token 32 byte ngẫu nhiên khiến
 * việc dò là bất khả thi, nhưng vẫn so bằng hàm hằng số cho đúng nguyên tắc.
 */
function sameToken(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function createSessions() {
  const sessions = new Map() // token -> { user, expiresAt }
  const attempts = new Map() // ip -> { fails, lockedUntil }

  const sweep = () => {
    const now = Date.now()
    for (const [t, s] of sessions) if (s.expiresAt <= now) sessions.delete(t)
    for (const [ip, a] of attempts) if (a.lockedUntil <= now && a.fails === 0) attempts.delete(ip)
  }

  return {
    sweep,
    get size() {
      return sessions.size
    },

    /** Phiên hợp lệ của request, hoặc undefined. */
    current(req) {
      const token = readCookie(req, COOKIE)
      if (token === undefined) return undefined
      for (const [t, s] of sessions) {
        if (!sameToken(t, token)) continue
        if (s.expiresAt <= Date.now()) {
          sessions.delete(t)
          return undefined
        }
        return s
      }
      return undefined
    },

    create(user) {
      if (sessions.size >= MAX_SESSIONS) {
        // Cắt phiên sắp hết hạn nhất: chặn kẻ đăng nhập lặp làm phình bộ nhớ.
        let oldest
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
      sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS })
      return token
    },

    destroy(req) {
      const token = readCookie(req, COOKIE)
      if (token === undefined) return
      for (const t of sessions.keys()) if (sameToken(t, token)) sessions.delete(t)
    },

    /** Còn bị khoá thì trả số phút còn lại, ngược lại 0. */
    lockedMinutes(ip) {
      const rec = attempts.get(ip)
      if (rec === undefined || rec.lockedUntil <= Date.now()) return 0
      return Math.ceil((rec.lockedUntil - Date.now()) / 60_000)
    },

    recordFail(ip) {
      const rec = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 }
      const fails = rec.fails + 1
      attempts.set(ip, {
        fails: fails >= MAX_FAILS ? 0 : fails,
        lockedUntil: fails >= MAX_FAILS ? Date.now() + LOCKOUT_MS : 0,
      })
    },

    clearFails(ip) {
      attempts.delete(ip)
    },

    cookie(token, req) {
      const flags = [
        `${COOKIE}=${token}`,
        'Path=/',
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
        'HttpOnly',
        'SameSite=Strict',
      ]
      if (overHttps(req)) flags.push('Secure')
      return flags.join('; ')
    },

    clearCookie() {
      return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
    },
  }
}

/**
 * Kiểm tra thông tin đăng nhập bằng chính API của trang quản trị.
 *
 * @returns {Promise<{ok: true, user: string} | {ok: false, reason: 'sai'|'be_loi'}>}
 *   `be_loi` khác `sai`: BE chết thì phải báo "hệ thống đang lỗi", chứ nói "sai
 *   mật khẩu" sẽ khiến người dùng đi đổi mật khẩu một cách vô ích.
 */
export async function verifyWithAdminApi(beUrl, email, password, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${beUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    })
    if (res.status === 200) {
      // BE bọc mọi phản hồi trong {statusCode, success, data}
      let email_ = email
      try {
        const body = await res.json()
        const user = body?.data?.user ?? body?.user
        if (typeof user?.email === 'string') email_ = user.email
      } catch {
        // thân phản hồi lạ thì vẫn coi là đăng nhập được, lấy email đã nhập
      }
      return { ok: true, user: email_ }
    }
    if (res.status === 401 || res.status === 400 || res.status === 403 || res.status === 429) {
      return { ok: false, reason: 'sai' }
    }
    return { ok: false, reason: 'be_loi' }
  } catch {
    return { ok: false, reason: 'be_loi' }
  } finally {
    clearTimeout(timer)
  }
}
