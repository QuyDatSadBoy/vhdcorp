/**
 * Cổng đăng nhập bản nội bộ VHD: bật server THẬT qua Loader rồi gọi HTTP thật.
 *
 * Đây là thứ chặn người ngoài chạy lệnh trên máy chủ, nên không kiểm bằng hàm
 * rời — phải đúng bề mặt mà trình duyệt nhìn thấy, kể cả đường WebSocket.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import HttpServer from '../src/index.ts'
import { hashPassword } from '../src/vhd-auth.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
  delete process.env['VHD_AUTH_USERS']
})

/** Boot server thật; usersPath = undefined → không cấu hình auth (như bản gốc). */
async function boot(usersPath: string | undefined): Promise<number> {
  root ??= await mkdtemp(join(tmpdir(), 'vhd-auth-'))
  if (usersPath === undefined) delete process.env['VHD_AUTH_USERS']
  else process.env['VHD_AUTH_USERS'] = usersPath

  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-host-webserver'",
    '  config:',
    "    host: '127.0.0.1'",
    '    port: 0',
    '',
  ].join('\n'))

  context = new Context()
  context.baseUrl = `${pathToFileURL(root).href}/`
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([['@deepseek-ai/dsh-host-webserver', HttpServer]])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  return (context.get('webServer') as { port: number }).port
}

/** Ghi tệp người dùng với mật khẩu đã băm. */
async function writeUsers(users: Record<string, string>): Promise<string> {
  root ??= await mkdtemp(join(tmpdir(), 'vhd-auth-'))
  const path = join(root, 'users.json')
  const hashed: Record<string, string> = {}
  for (const [name, pw] of Object.entries(users)) hashed[name] = await hashPassword(pw)
  await writeFile(path, JSON.stringify(hashed))
  return path
}

const PW = 'matkhaudaimanh123'

function url(port: number, path: string): string {
  return `http://127.0.0.1:${String(port)}${path}`
}

/** Đăng nhập, trả về cookie phiên. */
async function login(port: number, user: string, pw: string): Promise<Response> {
  return fetch(url(port, '/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: user, password: pw }).toString(),
    redirect: 'manual',
  })
}

function sessionCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? ''
  return raw.split(';')[0] ?? ''
}

describe('cổng đăng nhập VHD', () => {
  it('chưa cấu hình người dùng → chạy y như bản gốc, không chắn gì', async () => {
    const port = await boot(undefined)
    // Không route nào đăng ký → 404, KHÔNG phải chuyển hướng sang /login
    const res = await fetch(url(port, '/'), { redirect: 'manual' })
    expect(res.status).toBe(404)
  }, 60_000)

  it('tệp người dùng hỏng → dịch vụ KHÔNG khởi động (thà chết còn hơn mở cửa)', async () => {
    root = await mkdtemp(join(tmpdir(), 'vhd-auth-'))
    const bad = join(root, 'bad.json')
    await writeFile(bad, 'day khong phai json')
    await expect(boot(bad)).rejects.toThrow()
  }, 60_000)

  it('tệp người dùng rỗng → cũng không khởi động', async () => {
    root = await mkdtemp(join(tmpdir(), 'vhd-auth-'))
    const empty = join(root, 'empty.json')
    await writeFile(empty, '{}')
    await expect(boot(empty)).rejects.toThrow()
  }, 60_000)

  it('chưa đăng nhập: mở trang → đẩy về /login, không lộ tệp nào của ứng dụng', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/'), {
      headers: { accept: 'text/html' },
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/login')
  }, 60_000)

  it('chưa đăng nhập: gọi API → 401 JSON, không trả HTML lẫn vào', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/api/anything'), { redirect: 'manual' })
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toContain('application/json')
  }, 60_000)

  it('chưa đăng nhập: WebSocket cũng bị chặn (đây là cửa sau nếu bỏ sót)', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const socket = connect(port, '127.0.0.1')
    await once(socket, 'connect')
    const data = once(socket, 'data')
    socket.write(
      ['GET /ws HTTP/1.1', `Host: 127.0.0.1:${String(port)}`, 'Connection: Upgrade', 'Upgrade: dsh-test', '', ''].join('\r\n'),
    )
    const [buf] = (await data) as [Buffer]
    expect(String(buf)).toContain('401')
    socket.destroy()
  }, 60_000)

  it('trang /login mở được mà không cần phiên', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/login'))
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Đăng nhập')
    expect(html).toContain('VHD')
  }, 60_000)

  it('mật khẩu sai → 401 và KHÔNG cấp phiên', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await login(port, 'quydat', 'saibetnhe999')
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  }, 60_000)

  it('tên không tồn tại → cùng thông báo với sai mật khẩu (không tiết lộ tên nào có)', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const a = await login(port, 'quydat', 'saibetnhe999')
    const b = await login(port, 'khongcoai', 'saibetnhe999')
    expect(b.status).toBe(a.status)
    expect(await b.text()).toBe(await a.text())
  }, 60_000)

  it('đúng mật khẩu → cấp cookie HttpOnly + SameSite=Strict và vào được', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await login(port, 'quydat', PW)
    expect(res.status).toBe(302)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')

    // Có phiên rồi thì đi qua cổng, tới lớp định tuyến (không route nào → 404)
    const after = await fetch(url(port, '/'), {
      headers: { accept: 'text/html', cookie: sessionCookie(res) },
      redirect: 'manual',
    })
    expect(after.status).toBe(404)
  }, 60_000)

  it('cookie bịa → vẫn bị chặn', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/'), {
      headers: { accept: 'text/html', cookie: 'vhd_session=toitubiaracainay' },
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
  }, 60_000)

  it('đăng xuất → phiên bị thu hồi ngay, cookie cũ dùng lại không được', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const cookie = sessionCookie(await login(port, 'quydat', PW))
    const out = await fetch(url(port, '/auth/logout'), { headers: { cookie }, redirect: 'manual' })
    expect(out.status).toBe(302)
    const after = await fetch(url(port, '/'), {
      headers: { accept: 'text/html', cookie },
      redirect: 'manual',
    })
    expect(after.status).toBe(302) // lại bị đẩy về /login
  }, 60_000)

  it('sai 5 lần → khoá IP, lần 6 trả 429 dù nhập ĐÚNG mật khẩu', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    for (let i = 0; i < 5; i += 1) {
      const r = await login(port, 'quydat', 'saibetnhe999')
      expect(r.status).toBe(401)
    }
    const locked = await login(port, 'quydat', PW)
    expect(locked.status).toBe(429)
  }, 60_000)

  it('không cho chuyển hướng sang tên miền lạ sau khi đăng nhập', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/auth/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: 'quydat',
        password: PW,
        next: 'https://ke-xau.example.com/lay-phien',
      }).toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  }, 60_000)

  it('GET /auth/login → 405 (chỉ nhận POST)', async () => {
    const port = await boot(await writeUsers({ quydat: PW }))
    const res = await fetch(url(port, '/auth/login'), { redirect: 'manual' })
    expect(res.status).toBe(405)
  }, 60_000)
})
