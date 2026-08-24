/**
 * Cổng vào trợ lý nội bộ: bật cổng THẬT, BE giả, trợ lý giả, rồi gọi HTTP thật.
 *
 * Đây là thứ duy nhất chắn người ngoài khỏi một trợ lý chạy được lệnh trên máy
 * chủ, nên không kiểm bằng hàm rời — phải đúng bề mặt trình duyệt nhìn thấy.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { connect } from 'node:net'
import { once } from 'node:events'
import { execFileSync } from 'node:child_process'
import { createGate } from '../gate.mjs'
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
