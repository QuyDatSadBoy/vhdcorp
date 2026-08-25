#!/usr/bin/env node
/**
 * Cổng vào trợ lý nội bộ VHD Corp.
 *
 * nginx đưa toàn bộ subdomain vào đây. Chưa đăng nhập thì chỉ thấy trang đăng
 * nhập; đăng nhập rồi thì cổng bật trợ lý RIÊNG của người đó và chuyển tiếp mọi
 * request (kể cả WebSocket) vào đúng tiến trình ấy.
 *
 * Trợ lý bên trong giữ NGUYÊN mọi năng lực của bản gốc (bash, run_code…). Việc
 * chặn người ngoài làm ở cổng này; việc chặn người này thấy file người kia làm
 * bằng cách mỗi người một tiến trình + một thư mục home riêng.
 *
 * Biến môi trường:
 *   VHD_GATE_PORT     cổng của chính cổng vào       (mặc định 4400)
 *   VHD_BE_URL        địa chỉ BE để xác thực        (mặc định http://127.0.0.1:8080)
 *   VHD_HOMES         thư mục chứa home từng người  (mặc định ./homes)
 *   VHD_maxActive    trần số tiến trình cùng lúc   (mặc định 3)
 *   VHD_IDLE_MINUTES  rảnh bao lâu thì tắt          (mặc định 20)
 *   VHD_ADMIN_TOKEN   token cho trang quản trị đọc trạng thái (không đặt = tắt)
 *   VHD_PUBLIC_HOST   tên miền công khai (bắt buộc khi đứng sau nginx)
 */

import { createServer, request as httpRequest } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { connect } from 'node:net'
import { resolve } from 'node:path'
import { createSessions, clientIp, safeNext, verifyWithAdminApi } from './auth.mjs'
import { createInstances, slugFor } from './instances.mjs'
import { serveDownload, userRootFor } from './download.mjs'
import { serveFavicon } from './favicon.mjs'
import { busyPage, loginPage, startingPage } from './login-page.mjs'

const MAX_LOGIN_BODY = 4096

/** Cấu hình mặc định đọc từ biến môi trường; bài kiểm truyền thẳng giá trị riêng. */
export function configFromEnv(env = process.env) {
  return {
    port: Number(env.VHD_GATE_PORT ?? 4400),
    beUrl: (env.VHD_BE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, ''),
    homesRoot: resolve(env.VHD_HOMES ?? './homes'),
    maxActive: Number(env.VHD_MAX_ACTIVE ?? 3),
    idleMs: Number(env.VHD_IDLE_MINUTES ?? 20) * 60_000,
    // Gọi THẲNG bin đã build, không qua `pnpm dsh`: lớp bọc pnpm tốn thêm ~150MB
    // mỗi người và làm thời gian bật lên từ ~5s thành ~22s (đo trên máy lập trình).
    command: (env.VHD_DSH_COMMAND ?? 'node apps/cli/lib/bin.js web').split(' '),
    adminToken: env.VHD_ADMIN_TOKEN ?? '',
    trustedHost: env.VHD_PUBLIC_HOST ?? '',
    cwd: resolve(env.VHD_DSH_CWD ?? '..'),
  }
}

/**
 * Dựng một cổng vào. Trả về server (chưa listen) cùng session và instances để
 * bài kiểm quan sát được trạng thái bên trong.
 */
export function createGate(options) {
  const {
    beUrl, homesRoot, maxActive, idleMs, command, cwd, adminToken = '', trustedHost = '',
    log = (msg) => process.stdout.write(`${new Date().toISOString()} ${msg}\n`),
  } = options

  const sessions = createSessions()
  const instances = createInstances({ homesRoot, command, cwd, maxActive, idleMs, trustedHost, log })

/** Header an toàn cho mọi trang cổng tự trả. */
const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
}

function sendPage(res, code, html) {
  res.writeHead(code, PAGE_HEADERS)
  res.end(html)
}

function redirect(res, to, cookie) {
  const headers = { location: to, 'cache-control': 'no-store' }
  if (cookie !== undefined) headers['set-cookie'] = cookie
  res.writeHead(302, headers)
  res.end()
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_LOGIN_BODY) throw new Error('body quá lớn')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Chuyển tiếp một request HTTP vào tiến trình trợ lý của người đang đăng nhập. */
function proxyHttp(req, res, port, user) {
  const headers = { ...req.headers }
  delete headers.cookie // cookie của cổng không việc gì phải sang trợ lý
  headers['x-vhd-user'] = user

  const upstream = httpRequest(
    { host: '127.0.0.1', port, method: req.method, path: req.url, headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers)
      up.pipe(res)
    },
  )
  upstream.on('error', (err) => {
    log(`lỗi chuyển tiếp cho ${user}: ${err.message}`)
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Trợ lý đang không trả lời. Tải lại trang sau vài giây.')
  })
  req.pipe(upstream)
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    log(`lỗi xử lý request: ${err.message}`)
    if (res.headersSent) {
      res.destroy()
      return
    }
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Cổng vào đang lỗi.')
  })
})

async function handle(req, res) {
  sessions.sweep()
  const url = new URL(req.url ?? '/', 'http://x')
  const path = url.pathname

  // Biểu tượng tab: phục vụ TRƯỚC khi xác thực. Chặn cả favicon thì trình duyệt
  // không tải được và hiện icon mặc định — nhìn khác hẳn tab của web bán hàng.
  if (serveFavicon(req, res, path)) return

  // Trạng thái cho trang quản trị. Đứng TRƯỚC phần đăng nhập vì trang admin gọi
  // bằng token máy-với-máy, không có phiên người dùng.
  if (path === '/_gate/status') {
    // Không đặt token = tắt hẳn đường này. So sánh theo thời gian hằng số để
    // không dò được token qua độ trễ trả lời.
    const given = req.headers['x-vhd-admin-token']
    const ok = adminToken !== ''
      && typeof given === 'string'
      && given.length === adminToken.length
      && timingSafeEqual(Buffer.from(given), Buffer.from(adminToken))
    if (!ok) {
      res.writeHead(404, { 'cache-control': 'no-store' })
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({
      instances: instances.list(),
      active: instances.active,
      maxActive,
      idleMinutes: Math.round(idleMs / 60_000),
      sessions: sessions.size,
    }))
    return
  }

  if (path === '/auth/logout') {
    sessions.destroy(req)
    redirect(res, '/login', sessions.clearCookie())
    return
  }

  if (path === '/login') {
    if (sessions.current(req) !== undefined) {
      redirect(res, '/')
      return
    }
    sendPage(res, 200, loginPage({ next: safeNext(url.searchParams.get('next')) }))
    return
  }

  if (path === '/auth/login') {
    if (req.method !== 'POST') {
      res.writeHead(405, { allow: 'POST' })
      res.end()
      return
    }
    const ip = clientIp(req)
    const locked = sessions.lockedMinutes(ip)
    if (locked > 0) {
      sendPage(res, 429, loginPage({ error: `Sai quá nhiều lần. Thử lại sau ${locked} phút.` }))
      return
    }

    let form
    try {
      form = new URLSearchParams(await readBody(req))
    } catch {
      sendPage(res, 413, loginPage({ error: 'Dữ liệu gửi lên không hợp lệ.' }))
      return
    }
    const email = (form.get('email') ?? '').trim()
    const password = form.get('password') ?? ''
    const next = safeNext(form.get('next'))

    const result = await verifyWithAdminApi(beUrl, email, password)
    if (!result.ok) {
      if (result.reason === 'be_loi') {
        // Không tính là đăng nhập sai: BE chết mà khoá IP người dùng là oan.
        log(`không gọi được BE để xác thực (${beUrl})`)
        sendPage(res, 503, loginPage({
          error: 'Hệ thống xác thực đang không phản hồi. Thử lại sau ít phút.',
          email,
          next,
        }))
        return
      }
      sessions.recordFail(ip)
      sendPage(res, 401, loginPage({ error: 'Email hoặc mật khẩu không đúng.', email, next }))
      return
    }

    sessions.clearFails(ip)
    const token = sessions.create(result.user)
    log(`${result.user} đăng nhập từ ${ip}`)
    redirect(res, next, sessions.cookie(token, req))
    return
  }

  const session = sessions.current(req)
  if (session === undefined) {
    // Request của trang thì đưa tới /login; gọi API thì trả 401 gọn (nhồi HTML
    // vào chỗ chờ JSON chỉ làm giao diện báo lỗi khó hiểu).
    const wantsHtml = (req.headers.accept ?? '').includes('text/html')
    if (wantsHtml && (req.method === 'GET' || req.method === 'HEAD')) {
      redirect(res, `/login?next=${encodeURIComponent(path + url.search)}`)
      return
    }
    res.writeHead(401, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end('{"error":"chua_dang_nhap"}')
    return
  }

  // Tiến trình chưa sẵn sàng: trả TRANG CHỜ ngay thay vì giữ request 40 giây.
  // Giữ request là màn hình trắng, người dùng tưởng hỏng rồi bấm tải lại liên tục.
  if (!instances.ready(session.user)) {
    const wantsHtml = (req.headers.accept ?? '').includes('text/html')
    const isProbe = req.headers['x-vhd-probe'] === '1'
    // Bật ở chế độ chạy nền; lỗi xử lý ở lần request sau, đừng để promise treo.
    const booting = instances.ensure(session.user)
    booting.catch((err) => {
      if (err.code !== 'QUA_TAI') log(`không bật được trợ lý cho ${session.user}: ${err.message}`)
    })

    if (isProbe) {
      // Trang chờ đang tự kiểm: 202 = còn đang bật, khác 202 = vào được rồi.
      let code = 202
      try {
        await Promise.race([booting, new Promise((r) => setTimeout(() => r('cho'), 1200).unref())])
        if (instances.ready(session.user)) code = 200
      } catch (err) {
        code = err.code === 'QUA_TAI' ? 503 : 502
      }
      res.writeHead(code, { 'cache-control': 'no-store' })
      res.end()
      return
    }

    if (wantsHtml && (req.method === 'GET' || req.method === 'HEAD')) {
      // Bật xong nhanh (tiến trình đã sẵn) thì vào luôn, không nháy trang chờ.
      try {
        await Promise.race([booting, new Promise((r) => setTimeout(() => r('cho'), 2500).unref())])
      } catch (err) {
        if (err.code === 'QUA_TAI') {
          sendPage(res, 503, busyPage(maxActive))
          return
        }
        sendPage(res, 502, loginPage({ error: 'Không bật được trợ lý. Báo quản trị viên xem log.' }))
        return
      }
      if (!instances.ready(session.user)) {
        sendPage(res, 202, startingPage())
        return
      }
    }
  }

  // Tải file: bấm tên file trong khung hội thoại, bản gốc gọi host.openPath tức
  // "mở bằng ứng dụng mặc định của MÁY CHỦ" — vô nghĩa với người ngồi trình
  // duyệt từ xa, và bị DSH chặn 403 vì endpoint đó đòi quyền loopback. Ở đây
  // phục vụ đúng thứ người dùng cần: tải về máy họ, và CHỈ file nằm trong thư
  // mục của chính họ.
  if (path === '/vhd-download') {
    await serveDownload(req, res, userRootFor(homesRoot, slugFor(session.user)),
      url.searchParams.get('path'))
    instances.touch(session.user)
    return
  }

  let port
  try {
    port = await instances.ensure(session.user)
  } catch (err) {
    if (err.code === 'QUA_TAI') {
      sendPage(res, 503, busyPage(maxActive))
      return
    }
    log(`không bật được trợ lý cho ${session.user}: ${err.message}`)
    sendPage(res, 502, loginPage({ error: 'Không bật được trợ lý. Báo quản trị viên xem log.' }))
    return
  }
  proxyHttp(req, res, port, session.user)
}

// WebSocket: xác thực y như HTTP rồi nối thẳng hai socket. Bỏ chỗ này là để lại
// cửa sau đi vào trợ lý mà không cần đăng nhập.
server.on('upgrade', async (req, clientSocket, head) => {
  clientSocket.on('error', () => clientSocket.destroy())
  const session = sessions.current(req)
  if (session === undefined) {
    clientSocket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    clientSocket.destroy()
    return
  }

  let port
  try {
    port = await instances.ensure(session.user)
  } catch {
    clientSocket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n')
    clientSocket.destroy()
    return
  }

  const upstream = connect(port, '127.0.0.1')
  upstream.on('error', () => {
    clientSocket.destroy()
    upstream.destroy()
  })
  upstream.on('connect', () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`]
    for (const [key, value] of Object.entries(req.headers)) {
      if (key === 'cookie') continue // cookie của cổng không sang trợ lý
      for (const v of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${v}`)
    }
    lines.push(`x-vhd-user: ${session.user}`, '', '')
    upstream.write(lines.join('\r\n'))
    if (head.length > 0) upstream.write(head)
    // Kết nối sống lâu: mỗi lần có dữ liệu là người đó còn đang dùng, đừng tắt.
    const touch = () => instances.touch(session.user)
    clientSocket.on('data', touch)
    upstream.on('data', touch)
    upstream.pipe(clientSocket)
    clientSocket.pipe(upstream)
  })
})

  // Dọn định kỳ: tắt tiến trình rảnh để trả RAM, và bỏ phiên đã hết hạn.
  const sweeper = setInterval(() => {
    instances.sweep()
    sessions.sweep()
  }, 60_000)
  sweeper.unref()

  const close = async () => {
    clearInterval(sweeper)
    // Chờ tiến trình con chết THẬT trước khi đóng server: thoát sớm là để lại
    // tiến trình mồ côi giữ RAM.
    await instances.stopAll()
    return new Promise((done) => {
      server.close(done)
      // close() một mình sẽ chờ VÔ HẠN: trình duyệt giữ kết nối keep-alive, và
      // WebSocket/SSE thì không bao giờ tự kết thúc. Phải cắt, nếu không lệnh
      // restart dịch vụ sẽ treo cho tới khi systemd buộc phải giết tiến trình.
      server.closeAllConnections()
    })
  }

  return { server, sessions, instances, close, maxActive }
}

/** Chạy trực tiếp (không phải bị nạp bởi bài kiểm) thì mở cổng thật. */
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  const cfg = configFromEnv()
  const gate = createGate(cfg)
  let shuttingDown = false
  const shutdown = (signal) => {
    // Nhấn Ctrl+C hai lần / systemd gửi lại SIGTERM: đừng chạy hai lần chồng nhau
    if (shuttingDown) return
    shuttingDown = true
    process.stdout.write(`nhận ${signal} — tắt cổng vào và mọi tiến trình trợ lý\n`)
    gate.close().then(() => process.exit(0), () => process.exit(1))
    // Chốt chặn cuối: có gì treo thì vẫn thoát, đừng để systemd phải cắt.
    setTimeout(() => process.exit(0), 20_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  // CHỈ nghe loopback: nginx là cửa duy nhất từ ngoài vào.
  gate.server.listen(cfg.port, '127.0.0.1', () => {
    process.stdout.write(`cổng vào trợ lý nội bộ VHD: http://127.0.0.1:${cfg.port}\n`)
    process.stdout.write(`xác thực qua ${cfg.beUrl}/api/auth/admin/login · home tại ${cfg.homesRoot}\n`)
    process.stdout.write(`tối đa ${cfg.maxActive} người cùng lúc · tự tắt sau ${cfg.idleMs / 60_000} phút rảnh\n`)
  })
}
