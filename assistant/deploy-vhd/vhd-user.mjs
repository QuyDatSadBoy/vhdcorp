#!/usr/bin/env node
/**
 * Quản lý người được vào trợ lý nội bộ VHD.
 *
 *   node vhd-user.mjs add  <tên>   # thêm / đổi mật khẩu (hỏi mật khẩu, không hiện)
 *   node vhd-user.mjs del  <tên>   # xoá người đã nghỉ
 *   node vhd-user.mjs list         # xem ai đang có quyền
 *
 * Tệp người dùng lấy từ biến VHD_AUTH_USERS (mặc định ./vhd-users.json).
 * Chỉ dùng thư viện có sẵn của Node — không cần cài gì.
 */

import { randomBytes, scryptSync } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const FILE = process.env.VHD_AUTH_USERS ?? './vhd-users.json'
const KEYLEN = 64

function load() {
  if (!existsSync(FILE)) return {}
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'))
  } catch (err) {
    console.error(`Không đọc được ${FILE}: ${err.message}`)
    process.exit(1)
  }
}

function save(users) {
  writeFileSync(FILE, `${JSON.stringify(users, null, 2)}\n`, { mode: 0o600 })
  chmodSync(FILE, 0o600) // tệp đã có sẵn thì mode ở trên không áp — siết lại cho chắc
}

/**
 * Đọc hai lần mật khẩu.
 *
 * Ở bàn phím thật: bật raw mode để không ký tự nào hiện ra màn hình (mật khẩu
 * này mở được trợ lý chạy lệnh trên máy chủ, đừng để lộ khi có người đứng cạnh).
 * Khi đầu vào là pipe (kiểm thử, script): đọc thẳng từng dòng.
 */
async function readTwoPasswords(label) {
  if (!process.stdin.isTTY) {
    const all = await new Promise((resolve) => {
      let buf = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (c) => {
        buf += c
      })
      process.stdin.on('end', () => resolve(buf))
    })
    const [a = '', b = ''] = all.split('\n')
    return [a, b]
  }

  const readOne = (prompt) =>
    new Promise((resolve) => {
      process.stdout.write(prompt)
      let value = ''
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      const onData = (ch) => {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', onData)
          process.stdout.write('\n')
          resolve(value)
          return
        }
        if (ch === '\u0003') {
          // Ctrl+C phải thoát được, đừng bắt kẹt người dùng trong ô mật khẩu
          process.stdin.setRawMode(false)
          process.stdout.write('\n')
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1)
          return
        }
        value += ch
      }
      process.stdin.on('data', onData)
    })

  const first = await readOne(`Mật khẩu cho "${label}": `)
  const second = await readOne('Nhập lại: ')
  return [first, second]
}

const [cmd, name] = process.argv.slice(2)
const users = load()

if (cmd === 'list') {
  const names = Object.keys(users)
  console.log(names.length ? names.join('\n') : `(chưa có ai trong ${FILE})`)
  process.exit(0)
}

if (cmd === 'del') {
  if (!name) {
    console.error('Thiếu tên: vhd-user.mjs del <tên>')
    process.exit(1)
  }
  if (!Object.hasOwn(users, name)) {
    console.error(`Không có người dùng "${name}"`)
    process.exit(1)
  }
  delete users[name]
  save(users)
  console.log(`Đã xoá "${name}". Khởi động lại dịch vụ để cắt phiên đang mở:`)
  console.log('  sudo systemctl restart vhd-assistant')
  process.exit(0)
}

if (cmd === 'add') {
  if (!name) {
    console.error('Thiếu tên: vhd-user.mjs add <tên>')
    process.exit(1)
  }
  const [pw, again] = await readTwoPasswords(name)
  if (pw !== again) {
    console.error('Hai lần nhập không giống nhau — chưa lưu gì.')
    process.exit(1)
  }
  if (pw.length < 12) {
    console.error('Mật khẩu phải từ 12 ký tự: trợ lý này chạy được lệnh trên máy chủ.')
    process.exit(1)
  }
  const salt = randomBytes(16)
  users[name] = `${salt.toString('hex')}:${scryptSync(pw, salt, KEYLEN).toString('hex')}`
  save(users)
  const verb = 'Đã lưu'
  console.log(`${verb} "${name}" vào ${FILE} (quyền 600).`)
  console.log('Khởi động lại dịch vụ để nạp:  sudo systemctl restart vhd-assistant')
  process.exit(0)
}

console.error('Cách dùng: vhd-user.mjs add|del <tên> | list')
process.exit(1)
