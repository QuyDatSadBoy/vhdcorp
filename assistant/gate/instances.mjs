/**
 * Mỗi người đăng nhập có MỘT tiến trình trợ lý riêng, thư mục home riêng.
 *
 * Vì sao mỗi người một tiến trình chứ không dùng chung: sandbox của DSH chỉ chắn
 * GHI, không chắn ĐỌC. Dùng chung một tiến trình thì khoá thư mục kiểu nào anh em
 * vẫn đọc được file của nhau. Tiến trình riêng + `DSH_HOME` riêng là cách duy nhất
 * để "chỉ làm việc trong thư mục của mình" đúng cả với việc đọc.
 *
 * Vì máy chủ ít RAM: tiến trình chỉ bật khi có người vào, tự tắt sau một lúc
 * không ai dùng, và có trần số tiến trình chạy cùng lúc.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { request as httpGet } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Tên người dùng (email) → tên thư mục an toàn.
 *
 * Phải gộp cả chuỗi dấu chấm: giữ nguyên `..` là để lại đường thoát ra khỏi thư
 * mục home (`../../etc`), đúng thứ mà việc tách theo từng người phải chặn.
 */
export function slugFor(user) {
  const slug = String(user)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
  return slug.length > 0 ? slug.slice(0, 64) : 'nguoi_dung'
}

/**
 * Hỏi hệ điều hành một cổng đang trống.
 *
 * Tự đếm từ một cổng gốc là sai: tiến trình khác trên máy (kể cả cổng vào thứ hai
 * lúc kiểm thử) có thể đang giữ cổng đó, tiến trình trợ lý bind thất bại rồi chết
 * ngay — nhìn ra ngoài chỉ thấy "trợ lý không bật lên".
 */
function freePort(taken) {
  return new Promise((done, fail) => {
    const probe = createServer()
    probe.once('error', fail)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => {
        if (taken.has(port)) fail(new Error('cổng vừa bị lấy'))
        else done(port)
      })
    })
  })
}

/**
 * Chờ tới khi trợ lý THẬT SỰ phục vụ được, hoặc quá hạn.
 *
 * Không thể chỉ kiểm "cổng có nhận kết nối": webserver của DSH mở cổng ngay khi
 * kích hoạt, còn phần giao diện gắn vào sau — trong khoảng giữa, cổng nhận kết
 * nối nhưng mọi request đều 404. Đo thực tế: cổng mở sau ~6s, trang thật sau
 * ~35s. Chuyển tiếp trong khoảng đó là người dùng thấy trang trắng 404.
 *
 * Nên mốc sẵn sàng là: GET / trả 200.
 */
async function waitForReady(port, timeoutMs, isAlive) {
  const deadline = Date.now() + timeoutMs
  let lastStatus = 'chưa kết nối được'
  while (Date.now() < deadline) {
    if (!isAlive()) throw new Error('tiến trình trợ lý đã thoát trước khi phục vụ được')
    const status = await new Promise((resolve) => {
      const req = httpGet(
        { host: '127.0.0.1', port, path: '/', method: 'GET', timeout: 3000 },
        (res) => {
          res.resume() // phải xả thân phản hồi, không thì kết nối treo
          resolve(res.statusCode ?? 0)
        },
      )
      req.on('error', () => resolve(0))
      req.on('timeout', () => {
        req.destroy()
        resolve(0)
      })
      req.end()
    })
    if (status === 200) return
    lastStatus = status === 0 ? 'chưa kết nối được' : `HTTP ${status}`
    await new Promise((r) => setTimeout(r, 500).unref())
  }
  throw new Error(`trợ lý chưa phục vụ được sau ${timeoutMs}ms (lần cuối: ${lastStatus})`)
}

/**
 * @param options.homesRoot   thư mục chứa home của từng người
 * @param options.command     lệnh chạy trợ lý, ví dụ ['pnpm','dsh','web']
 * @param options.cwd         thư mục chạy lệnh (nơi cài trợ lý)
 * @param options.maxActive   trần số tiến trình chạy cùng lúc (giữ RAM)
 * @param options.idleMs      không ai dùng bao lâu thì tắt
 * @param options.bootMs      chờ tiến trình mở cổng tối đa bao lâu
 * @param options.env         biến môi trường thêm cho tiến trình con
 * @param options.log         hàm ghi log
 */
export function createInstances(options) {
  const {
    homesRoot,
    command,
    cwd,
    maxActive = 3,
    idleMs = 20 * 60_000,
    bootMs = 120_000,
    env = {},
    log = () => {},
  } = options

  const live = new Map() // user -> { port, child, lastSeen, starting }
  const usedPorts = new Set()


  const stop = (user, why) => {
    const it = live.get(user)
    if (it === undefined) return
    live.delete(user)
    usedPorts.delete(it.port)
    log(`tắt trợ lý của ${user} (${why})`)
    it.child.kill('SIGTERM')
    // Không chịu thoát thì cắt hẳn, đừng để tiến trình treo giữ RAM
    const child = it.child
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }, 10_000).unref()
  }

  /** Tắt tiến trình rảnh lâu nhất để nhường chỗ; trả false nếu không có ai rảnh. */
  const evictIdlest = () => {
    let victim
    let oldest = Number.POSITIVE_INFINITY
    for (const [user, it] of live) {
      if (it.lastSeen < oldest) {
        oldest = it.lastSeen
        victim = user
      }
    }
    if (victim === undefined) return false
    stop(victim, 'nhường chỗ cho người mới')
    return true
  }

  return {
    get active() {
      return live.size
    },

    /** Tiến trình của người này đã sẵn sàng nhận request chưa. */
    ready(user) {
      const it = live.get(user)
      return it !== undefined && it.starting === undefined
    },

    /** Danh sách để trang trạng thái / dọn rác xem. */
    list() {
      return [...live.entries()].map(([user, it]) => ({
        user,
        port: it.port,
        idleSeconds: Math.round((Date.now() - it.lastSeen) / 1000),
      }))
    },

    /**
     * Bật (nếu cần) trợ lý của người này và trả cổng của họ.
     *
     * Ghi chỗ vào bảng theo dõi NGAY, trước mọi `await`. Nếu để `await` (xin cổng
     * trống, chờ mở cổng) chạy trước khi ghi, hai request cùng lúc của cùng một
     * người sẽ đều thấy "chưa có" và cùng spawn: bảng chỉ giữ được một tiến trình,
     * cái còn lại thành mồ côi, không ai tắt, giữ RAM đến khi máy chủ hết.
     */
    async ensure(user) {
      const existing = live.get(user)
      if (existing !== undefined) {
        existing.lastSeen = Date.now()
        if (existing.starting !== undefined) await existing.starting
        return existing.port
      }

      if (live.size >= maxActive && !evictIdlest()) {
        throw Object.assign(new Error('máy chủ đang phục vụ tối đa số người'), { code: 'QUA_TAI' })
      }

      // Giữ chỗ đồng bộ: từ đây mọi request khác của người này sẽ chờ `starting`
      // thay vì spawn thêm một tiến trình nữa.
      const record = { port: 0, child: undefined, lastSeen: Date.now(), starting: undefined }
      live.set(user, record)

      record.starting = (async () => {
        const slug = slugFor(user)
        const home = join(homesRoot, slug)
        const workspace = join(home, 'workspace')
        mkdirSync(workspace, { recursive: true, mode: 0o700 })
        // KHÔNG tạo sẵn `profiles/web`: DSH thấy thư mục đã tồn tại là coi như hồ
        // sơ đã khởi tạo và bỏ qua bước nạp bundle, kết quả là không có giao diện
        // và mọi request trả 404. Để nó tự tạo.

        const port = await freePort(usedPorts)
        usedPorts.add(port)
        record.port = port

        const [bin, ...rest] = command
        // --no-open: máy chủ không có trình duyệt để mở, mà DSH mặc định vẫn thử.
        const args = [...rest, '--host', '127.0.0.1', '--port', String(port), '--no-open']
        const child = spawn(bin, args, {
          cwd,
          env: {
            ...process.env,
            ...env,
            DSH_HOME: home,
            // Thư mục làm việc của người này — trợ lý mở lên là ở đây.
            VHD_WORKSPACE: workspace,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        record.child = child

        // spawn thất bại (sai đường dẫn lệnh, thiếu quyền) phát ra event 'error'.
        // Không bắt là ném ra ngoài dưới dạng uncaughtException và SẬP CẢ CỔNG VÀO
        // cho mọi người — chỉ vì một biến môi trường cấu hình sai.
        const spawnFailed = new Promise((_, reject) => {
          child.once('error', (err) => {
            reject(new Error(`không chạy được lệnh trợ lý: ${err.message}`))
          })
        })

        let alive = true
        child.once('exit', (code, signal) => {
          alive = false
          log(`trợ lý của ${user} thoát (code=${String(code)} signal=${String(signal)})`)
          if (live.get(user) === record) {
            live.delete(user)
            usedPorts.delete(port)
          }
        })
        // Không đọc stdout/stderr thì ống đầy sẽ làm tiến trình con treo.
        child.stdout.on('data', (b) => log(`[${slug}] ${String(b).trimEnd()}`))
        child.stderr.on('data', (b) => log(`[${slug}] ${String(b).trimEnd()}`))

        // Đua giữa "mở được cổng" và "chạy lệnh thất bại": chờ mỗi cổng thì lệnh
        // sai sẽ phải đợi hết bootMs mới báo lỗi.
        try {
          await Promise.race([waitForReady(port, bootMs, () => alive), spawnFailed])
        } finally {
          // Bên thua không còn ai chờ; thiếu dòng này là một promise bị từ chối
          // mà không ai xử lý, Node sẽ cảnh báo rồi kết thúc tiến trình.
          spawnFailed.catch(() => {})
        }
        log(`bật trợ lý của ${user} ở cổng ${port}, home ${home}`)
        return port
      })()

      try {
        const port = await record.starting
        record.starting = undefined
        return port
      } catch (err) {
        // Bật không lên: dọn sạch chính record này (đừng xoá record của lần thử
        // sau đã kịp thay vào chỗ), rồi mới báo lỗi ra ngoài.
        record.starting = undefined
        if (live.get(user) === record) {
          live.delete(user)
          usedPorts.delete(record.port)
        }
        record.child?.kill('SIGKILL')
        throw err
      }
    },

    touch(user) {
      const it = live.get(user)
      if (it !== undefined) it.lastSeen = Date.now()
    },

    /** Tắt các tiến trình rảnh quá lâu. Gọi định kỳ. */
    sweep() {
      const now = Date.now()
      for (const [user, it] of [...live]) {
        if (now - it.lastSeen > idleMs) stop(user, 'rảnh quá lâu, trả RAM cho máy chủ')
      }
    },

    stop,

    stopAll() {
      for (const user of [...live.keys()]) stop(user, 'cổng vào đang tắt')
    },
  }
}
