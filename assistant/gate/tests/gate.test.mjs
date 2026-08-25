/**
 * Cổng vào trợ lý nội bộ: bật cổng THẬT, BE giả, trợ lý giả, rồi gọi HTTP thật.
 *
 * Đây là thứ duy nhất chắn người ngoài khỏi một trợ lý chạy được lệnh trên máy
 * chủ, nên không kiểm bằng hàm rời — phải đúng bề mặt trình duyệt nhìn thấy.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { connect } from 'node:net'
import { once } from 'node:events'
import { execFileSync } from 'node:child_process'
import { configFromEnv, createGate } from '../gate.mjs'
import { slugFor } from '../instances.mjs'
import { GOOD, startFakeBe } from './fake-be.mjs'

const FAKE_DSH = join(import.meta.dirname, 'fake-dsh.mjs')

let be
let homes
const gates = []

before(async () => {
  be = await startFakeBe()
  homes = await mkdtemp(join(tmpdir(), 'vhd-gate-'))
})

after(async () => {
  for (const g of gates) await g.close()
  be.server.close()
  await rm(homes, { recursive: true, force: true })
})

/** Bật một cổng vào trên cổng do hệ điều hành cấp. */
async function startGate(overrides = {}) {
  const gate = createGate({
    beUrl: be.url,
    homesRoot: homes,
    maxActive: 3,
    idleMs: 20 * 60_000,
    command: [process.execPath, FAKE_DSH],
    cwd: import.meta.dirname,
    log: () => {},
    ...overrides,
  })
  gates.push(gate)
  await new Promise((done) => gate.server.listen(0, '127.0.0.1', done))
  return { gate, base: `http://127.0.0.1:${gate.server.address().port}` }
}

const login = (base, email, password, extra = {}) =>
  fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password, ...extra }).toString(),
    redirect: 'manual',
  })

/** Số tiến trình trợ lý giả mà hệ điều hành đang thấy. */
function countFakeDsh() {
  try {
    return Number(execFileSync('pgrep', ['-fc', 'fake-dsh.mjs'], { encoding: 'utf8' }).trim())
  } catch {
    return 0 // pgrep trả mã khác 0 khi không khớp gì
  }
}

const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0]

describe('đọc cấu hình từ biến môi trường', () => {
  // Đặt biến trong .env mà mã đọc sai TÊN thì im lặng dùng mặc định: cổng vào
  // gọi sai địa chỉ BE và không ai đăng nhập được, mà log không báo gì.
  it('mọi biến VHD_* đều có tác dụng', () => {
    const c = configFromEnv({
      VHD_GATE_PORT: '4411',
      VHD_BE_URL: 'http://be.test:9000/',
      VHD_HOMES: '/tmp/nha-rieng',
      VHD_MAX_ACTIVE: '7',
      VHD_IDLE_MINUTES: '5',
      VHD_DSH_COMMAND: 'node lenh-rieng.js web',
      VHD_DSH_CWD: '/tmp/noi-cai',
    })
    assert.equal(c.port, 4411)
    assert.equal(c.beUrl, 'http://be.test:9000') // cắt dấu / cuối
    assert.equal(c.homesRoot, '/tmp/nha-rieng')
    assert.equal(c.maxActive, 7)
    assert.equal(c.idleMs, 5 * 60_000)
    assert.deepEqual(c.command, ['node', 'lenh-rieng.js', 'web'])
    assert.equal(c.cwd, '/tmp/noi-cai')
  })

  it('không đặt gì → mặc định an toàn cho máy chủ', () => {
    const c = configFromEnv({})
    assert.equal(c.port, 4400)
    assert.equal(c.beUrl, 'http://127.0.0.1:8080') // đúng PORT trong be/.env
    assert.equal(c.maxActive, 3)
    assert.equal(c.idleMs, 20 * 60_000)
    // Gọi thẳng bin đã build, KHÔNG qua pnpm (tốn thêm ~150MB mỗi người)
    assert.ok(!c.command.includes('pnpm'))
    assert.ok(c.command.join(' ').includes('apps/cli/lib/bin.js'))
  })
})

describe('chặn người chưa đăng nhập', () => {
  it('mở trang → đẩy về /login, không lộ tệp nào của trợ lý', async () => {
    const { base } = await startGate()
    const res = await fetch(base, { headers: { accept: 'text/html' }, redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location'), /\/login/)
  })

  it('gọi API → 401 JSON, không trộn HTML vào', async () => {
    const { base } = await startGate()
    const res = await fetch(`${base}/api/session/list`, { redirect: 'manual' })
    assert.equal(res.status, 401)
    assert.match(res.headers.get('content-type'), /application\/json/)
  })

  it('WebSocket cũng bị chặn (bỏ sót chỗ này là để lại cửa sau)', async () => {
    const { base } = await startGate()
    const port = Number(new URL(base).port)
    const socket = connect(port, '127.0.0.1')
    await once(socket, 'connect')
    const data = once(socket, 'data')
    socket.write('GET /ws HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n')
    const [buf] = await data
    assert.match(String(buf), /401/)
    socket.destroy()
  })

  it('trang /login mở được và mang thương hiệu VHD', async () => {
    const { base } = await startGate()
    const res = await fetch(`${base}/login`)
    assert.equal(res.status, 200)
    const html = await res.text()
    assert.match(html, /Đăng nhập/)
    assert.match(html, /VHD Corp/)
    // Tự chứa: không kéo tệp ngoài nào về khi chưa đăng nhập
    assert.doesNotMatch(html, /<script|<link[^>]+stylesheet/)
  })
})

describe('biểu tượng tab', () => {
  it('tải được KHI CHƯA đăng nhập — nếu không trình duyệt hiện icon mặc định', async () => {
    const { base } = await startGate()
    for (const p of ['/favicon.ico', '/favicon.png', '/favicon.svg', '/apple-touch-icon.png']) {
      const res = await fetch(base + p)
      assert.equal(res.status, 200, `${p} phải mở được khi chưa đăng nhập`)
      assert.equal(res.headers.get('content-type'), 'image/png')
      assert.ok(Number(res.headers.get('content-length')) > 500, `${p} phải có nội dung thật`)
    }
  })

  it('trang đăng nhập có khai báo biểu tượng', async () => {
    const { base } = await startGate()
    const html = await (await fetch(`${base}/login`)).text()
    assert.match(html, /<link rel="icon" href="\/favicon\.png"/)
  })

  it('phương thức khác GET/HEAD trả 405', async () => {
    const { base } = await startGate()
    assert.equal((await fetch(`${base}/favicon.ico`, { method: 'POST' })).status, 405)
  })
})

describe('đăng nhập bằng tài khoản quản trị', () => {
  it('sai mật khẩu → 401, không cấp phiên', async () => {
    const { base } = await startGate()
    const res = await login(base, GOOD.email, 'saibetnhe999')
    assert.equal(res.status, 401)
    assert.equal(res.headers.get('set-cookie'), null)
  })

  it('đúng → cookie HttpOnly + SameSite=Strict', async () => {
    const { base } = await startGate()
    const res = await login(base, GOOD.email, GOOD.password)
    assert.equal(res.status, 302)
    const cookie = res.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Strict/)
  })

  it('BE chết → báo hệ thống lỗi và KHÔNG tính là đăng nhập sai', async () => {
    const { base, gate } = await startGate({ beUrl: 'http://127.0.0.1:1' })
    for (let i = 0; i < 6; i += 1) {
      const res = await login(base, GOOD.email, GOOD.password)
      assert.equal(res.status, 503)
      assert.match(await res.text(), /không phản hồi/)
    }
    // Không bị khoá oan: BE sống lại là vào được ngay
    assert.equal(gate.sessions.lockedMinutes('127.0.0.1'), 0)
  })

  it('sai 5 lần → khoá IP, lần 6 trả 429 dù nhập ĐÚNG', async () => {
    const { base } = await startGate()
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login(base, GOOD.email, 'saibetnhe999')).status, 401)
    }
    assert.equal((await login(base, GOOD.email, GOOD.password)).status, 429)
  })

  it('khoá theo IP THẬT của từng người, không khoá chung cả công ty', async () => {
    const { base } = await startGate()
    const sai = (ip) =>
      fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-real-ip': ip },
        body: new URLSearchParams({ email: GOOD.email, password: 'saibetnhe999' }).toString(),
        redirect: 'manual',
      })

    // Người A nhập sai 5 lần → chỉ A bị khoá
    for (let i = 0; i < 5; i += 1) assert.equal((await sai('1.2.3.4')).status, 401)
    const aBiKhoa = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-real-ip': '1.2.3.4' },
      body: new URLSearchParams({ email: GOOD.email, password: GOOD.password }).toString(),
      redirect: 'manual',
    })
    assert.equal(aBiKhoa.status, 429)

    // Người B vẫn đăng nhập được bình thường — đứng sau Cloudflare mà lấy sai IP
    // thì cả công ty bị khoá theo A.
    const bVaoDuoc = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-real-ip': '5.6.7.8' },
      body: new URLSearchParams({ email: GOOD.email, password: GOOD.password }).toString(),
      redirect: 'manual',
    })
    assert.equal(bVaoDuoc.status, 302)
  })

  it('không chuyển hướng sang tên miền lạ sau khi đăng nhập', async () => {
    const { base } = await startGate()
    const res = await login(base, GOOD.email, GOOD.password, { next: 'https://ke-xau.example.com/x' })
    assert.equal(res.headers.get('location'), '/')
  })

  it('GET /auth/login → 405 (chỉ nhận POST)', async () => {
    const { base } = await startGate()
    assert.equal((await fetch(`${base}/auth/login`, { redirect: 'manual' })).status, 405)
  })

  it('đăng xuất → cookie cũ dùng lại không được', async () => {
    const { base } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    await fetch(`${base}/auth/logout`, { headers: { cookie }, redirect: 'manual' })
    const after = await fetch(base, { headers: { accept: 'text/html', cookie }, redirect: 'manual' })
    assert.equal(after.status, 302)
  })

  it('cookie bịa → vẫn bị chặn', async () => {
    const { base } = await startGate()
    const res = await fetch(base, {
      headers: { accept: 'text/html', cookie: 'vhd_gate=toitubiaracainay' },
      redirect: 'manual',
    })
    assert.equal(res.status, 302)
  })
})

describe('workspace riêng theo từng nick', () => {
  it('đăng nhập rồi → vào đúng trợ lý của mình, home riêng', async () => {
    const { base } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    const res = await fetch(`${base}/api/hello`, { headers: { cookie } })
    assert.equal(res.status, 200)
    const body = await res.json()

    const slug = slugFor(GOOD.email)
    assert.equal(body.home, join(homes, slug))
    assert.equal(body.workspace, join(homes, slug, 'workspace'))
    // Thư mục làm việc MẶC ĐỊNH phải là của chính họ: DSH lấy workspace và biên
    // giới ghi của sandbox từ process.cwd(), nên bật sai chỗ là họ mở lên thấy
    // thư mục cài đặt của trợ lý chứ không phải thư mục của mình.
    assert.equal(body.cwd, join(homes, slug, 'workspace'))
    // HOME phải là thư mục của chính họ: để nguyên HOME của tài khoản hệ thống
    // thì bộ chọn thư mục mở ra ở gốc và họ thấy thư mục của người khác.
    assert.equal(body.home, join(homes, slug))
    assert.equal(body.user, GOOD.email)
    assert.equal(body.path, '/api/hello')
    // Cookie của cổng KHÔNG được chuyển vào trợ lý
    assert.equal(body.cookie, null)
    assert.ok(existsSync(join(homes, slug, 'workspace')))
  })

  it('hai người → hai tiến trình, hai thư mục, không dùng chung', async () => {
    const { base, gate } = await startGate()
    const a = cookieOf(await login(base, GOOD.email, GOOD.password))
    const bodyA = await (await fetch(`${base}/x`, { headers: { cookie: a } })).json()

    // Người thứ hai: cấp phiên trực tiếp (BE giả chỉ có một tài khoản)
    const token = gate.sessions.create('nhanvien2@vhdcorp.com')
    const bodyB = await (await fetch(`${base}/x`, { headers: { cookie: `vhd_gate=${token}` } })).json()

    assert.notEqual(bodyA.home, bodyB.home)
    assert.notEqual(bodyA.workspace, bodyB.workspace)
    assert.equal(bodyB.user, 'nhanvien2@vhdcorp.com')
    assert.equal(gate.instances.active, 2)
  })

  it('truyền --trusted-host cho trợ lý khi có tên miền công khai', async () => {
    // DSH TỪ CHỐI (403 'forbidden') mọi request có Host không phải loopback và
    // không được khai báo. Đứng sau nginx thì Host là tên miền công khai, nên
    // thiếu cờ này là mọi lệnh gọi API đều 403 — đúng lỗi 'không tạo được thư
    // mục làm việc' đã gặp trên máy chủ thật.
    const { base } = await startGate({ trustedHost: 'assistant.vhdcorp.com' })
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    const body = await (await fetch(`${base}/x`, { headers: { cookie } })).json()
    assert.match(body.args, /--trusted-host assistant\.vhdcorp\.com/)
  })

  it('không có tên miền công khai thì không thêm cờ (chạy một mình ở loopback)', async () => {
    const { base } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    const body = await (await fetch(`${base}/y`, { headers: { cookie } })).json()
    assert.doesNotMatch(body.args, /--trusted-host/)
  })

  it('tên có ký tự lạ vẫn ra thư mục an toàn (không thoát ra ngoài)', () => {
    assert.equal(slugFor('../../etc/passwd'), 'etc_passwd')
    assert.ok(!slugFor('../../etc/passwd').includes('..'))
    assert.equal(slugFor('A B@c.com'), 'a_b_c.com')
    assert.equal(slugFor('///'), 'nguoi_dung')
  })

  it('WebSocket sau khi đăng nhập → nối được vào trợ lý của mình', async () => {
    const { base } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    // Bật tiến trình trước để lần nâng cấp không phải chờ khởi động
    await fetch(`${base}/warm`, { headers: { cookie } })

    const socket = connect(Number(new URL(base).port), '127.0.0.1')
    await once(socket, 'connect')
    // Gom dữ liệu tới khi thấy phần thân: header 101 và thân thường về ở HAI gói
    // TCP khác nhau, đọc một lần 'data' là bắt trượt phần thân.
    const text = await new Promise((done, fail) => {
      let acc = ''
      socket.on('data', (b) => {
        acc += String(b)
        if (acc.includes('user=')) done(acc)
      })
      socket.once('error', fail)
      setTimeout(() => fail(new Error(`chờ quá lâu, chỉ nhận: ${acc}`)), 5000).unref()
      socket.write(
        `GET /ws HTTP/1.1\r\nHost: x\r\nCookie: ${cookie}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`,
      )
    })
    assert.match(text, /101 Switching Protocols/)
    assert.match(text, new RegExp(`user=${GOOD.email}`))
    socket.destroy()
  })
})

describe('trang quản trị đọc trạng thái', () => {
  it('không đặt token → đường này không tồn tại (404)', async () => {
    const { base } = await startGate()
    const res = await fetch(`${base}/_gate/status`, { headers: { 'x-vhd-admin-token': 'bat-ky' } })
    assert.equal(res.status, 404)
  })

  it('sai token → 404, không nói là có đường này', async () => {
    const { base } = await startGate({ adminToken: 'token-that-dai-32-ky-tu-abcdef' })
    const res = await fetch(`${base}/_gate/status`, { headers: { 'x-vhd-admin-token': 'sai' } })
    assert.equal(res.status, 404)
  })

  it('không kèm token → 404 (không lộ ra cho người đang đăng nhập)', async () => {
    const { base } = await startGate({ adminToken: 'token-that-dai-32-ky-tu-abcdef' })
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    const res = await fetch(`${base}/_gate/status`, { headers: { cookie } })
    assert.equal(res.status, 404)
  })

  it('đúng token → trả ai đang dùng, trần, thời gian rảnh', async () => {
    const token = 'token-that-dai-32-ky-tu-abcdef'
    const { base } = await startGate({ adminToken: token, maxActive: 3, idleMs: 20 * 60_000 })
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    await fetch(`${base}/x`, { headers: { cookie } })

    const res = await fetch(`${base}/_gate/status`, { headers: { 'x-vhd-admin-token': token } })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.active, 1)
    assert.equal(body.maxActive, 3)
    assert.equal(body.idleMinutes, 20)
    assert.equal(body.sessions, 1)
    assert.equal(body.instances[0].user, GOOD.email)
    assert.equal(typeof body.instances[0].idleSeconds, 'number')
  })
})

describe('tải file về máy người dùng', () => {
  /** Dựng sẵn phiên + thư mục của một người, trả về cookie và các đường dẫn. */
  async function withFiles() {
    const { base, gate } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    await fetch(`${base}/warm`, { headers: { cookie } })  // bật tiến trình → tạo thư mục
    const slug = slugFor(GOOD.email)
    const ws = join(homes, slug, 'workspace')
    await writeFile(join(ws, 'bao-gia.txt'), 'gioăng bích DN50 — 120.000đ', 'utf8')
    return { base, gate, cookie, slug, ws }
  }

  it('tải được file trong thư mục của mình, đúng tên và nội dung', async () => {
    const { base, cookie, ws } = await withFiles()
    const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(join(ws, 'bao-gia.txt'))}`,
      { headers: { cookie } })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-disposition'), /attachment/)
    assert.match(res.headers.get('content-disposition'), /bao-gia\.txt/)
    // Trình duyệt không được đoán kiểu rồi chạy tệp của người dùng như HTML
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(await res.text(), 'gioăng bích DN50 — 120.000đ')
  })

  it('tên tệp tiếng Việt vẫn tải đúng tên', async () => {
    const { base, cookie, ws } = await withFiles()
    const ten = 'báo giá tháng 8.txt'
    await writeFile(join(ws, ten), 'nội dung', 'utf8')
    const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(join(ws, ten))}`,
      { headers: { cookie } })
    assert.equal(res.status, 200)
    // RFC 5987: tên có dấu đi ở filename*, còn filename giữ bản ASCII cho trình duyệt cũ
    assert.match(res.headers.get('content-disposition'), /filename\*=UTF-8''/)
    assert.ok(decodeURIComponent(res.headers.get('content-disposition').split("UTF-8''")[1]).includes(ten))
  })

  it('KHÔNG tải được file ngoài thư mục của mình', async () => {
    const { base, cookie } = await withFiles()
    for (const p of ['/etc/passwd', join(homes, 'nguoi_khac', 'workspace', 'bi-mat.txt'), '/opt']) {
      const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(p)}`, { headers: { cookie } })
      assert.equal(res.status, 404, `phải chặn ${p}`)
    }
  })

  it('liên kết mềm trỏ ra ngoài cũng bị chặn', async () => {
    const { base, cookie, ws } = await withFiles()
    // So chuỗi thô thì cái này lọt: đường dẫn nằm trong workspace nhưng trỏ ra ngoài
    const link = join(ws, 'loi-ra')
    await symlink('/etc/passwd', link).catch(() => {})
    const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(link)}`, { headers: { cookie } })
    assert.equal(res.status, 404)
  })

  it('chưa đăng nhập thì không tải được', async () => {
    const { base, ws } = await withFiles()
    const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(join(ws, 'bao-gia.txt'))}`,
      { redirect: 'manual' })
    assert.equal(res.status, 401)
  })

  it('thư mục thì báo rõ, không trả về gì', async () => {
    const { base, cookie, ws } = await withFiles()
    const res = await fetch(`${base}/vhd-download?path=${encodeURIComponent(ws)}`, { headers: { cookie } })
    assert.equal(res.status, 400)
  })
})

describe('giữ RAM cho máy chủ', () => {
  it('nhiều request cùng lúc của MỘT người → chỉ một tiến trình, không mồ côi', async () => {
    const before = countFakeDsh()
    const { base, gate } = await startGate()
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    // Trình duyệt thật mở trang là bắn một loạt request song song. Nếu ensure()
    // không giữ chỗ đồng bộ thì mỗi request spawn một tiến trình, bảng chỉ theo
    // dõi được cái cuối, phần còn lại thành mồ côi giữ RAM mãi.
    await Promise.all(
      ['/a', '/b', '/c', '/d', '/e', '/f'].map((p) => fetch(base + p, { headers: { cookie } })),
    )
    assert.equal(gate.instances.active, 1)

    // Đếm tiến trình THẬT do hệ điều hành thấy, theo mức TĂNG: các bài kiểm khác
    // trong cùng tệp cũng đang giữ tiến trình con của chúng.
    assert.equal(countFakeDsh() - before, 1)
  })

  it('bật không lên → không để lại tiến trình và cho thử lại được', async () => {
    // Lệnh không tồn tại → spawn thất bại
    const { base, gate } = await startGate({ command: ['/khong/co/lenh/nay'] })
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    const res = await fetch(`${base}/x`, { headers: { cookie } })
    assert.equal(res.status, 502)
    // Không để lại bản ghi treo: người dùng tải lại là thử lại được ngay
    assert.equal(gate.instances.active, 0)
  })

  it('tắt cổng vào → KHÔNG còn tiến trình mồ côi nào', async () => {
    const before = countFakeDsh()
    const gate = createGate({
      beUrl: be.url, homesRoot: homes, maxActive: 3, idleMs: 10 * 60_000,
      command: [process.execPath, FAKE_DSH], cwd: import.meta.dirname, log: () => {},
    })
    await new Promise((done) => gate.server.listen(0, '127.0.0.1', done))
    const base = `http://127.0.0.1:${gate.server.address().port}`
    for (const who of ['x@v.com', 'y@v.com']) {
      const t = gate.sessions.create(who)
      await fetch(`${base}/x`, { headers: { cookie: `vhd_gate=${t}` } })
    }
    assert.equal(countFakeDsh() - before, 2)

    // close() phải CHỜ tiến trình con chết thật. Thoát sớm là để lại tiến trình
    // mồ côi giữ RAM mãi — không ai tắt hộ.
    await gate.close()
    assert.equal(countFakeDsh() - before, 0)
  })

  it('rảnh quá lâu → tự tắt, trả RAM', async () => {
    const { base, gate } = await startGate({ idleMs: 1 })
    const cookie = cookieOf(await login(base, GOOD.email, GOOD.password))
    await fetch(`${base}/x`, { headers: { cookie } })
    assert.equal(gate.instances.active, 1)

    await new Promise((r) => setTimeout(r, 30))
    gate.instances.sweep()
    assert.equal(gate.instances.active, 0)
  })

  it('quá trần người cùng lúc → người rảnh lâu nhất nhường chỗ', async () => {
    const { base, gate } = await startGate({ maxActive: 2 })
    for (const who of ['a@v.com', 'b@v.com']) {
      const t = gate.sessions.create(who)
      await fetch(`${base}/x`, { headers: { cookie: `vhd_gate=${t}` } })
    }
    assert.equal(gate.instances.active, 2)

    const t3 = gate.sessions.create('c@v.com')
    const res = await fetch(`${base}/x`, { headers: { cookie: `vhd_gate=${t3}` } })
    assert.equal(res.status, 200)
    // Vẫn đúng trần: người vào sau đẩy người rảnh lâu nhất ra
    assert.equal(gate.instances.active, 2)
    const users = gate.instances.list().map((i) => i.user)
    assert.ok(users.includes('c@v.com'))
    assert.ok(!users.includes('a@v.com'))
  })
})
