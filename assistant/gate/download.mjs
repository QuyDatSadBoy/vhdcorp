/**
 * Tải file trong thư mục của chính người đang đăng nhập.
 *
 * Vì sao cần: bấm tên file trong khung hội thoại, bản gốc gọi `host.openPath` —
 * tức "mở bằng ứng dụng mặc định của MÁY CHỦ". Chạy trên máy cá nhân thì hợp lý,
 * nhưng ở đây người dùng ngồi trình duyệt từ xa nên việc đó vừa vô nghĩa vừa bị
 * DSH chặn (403, endpoint đó yêu cầu quyền loopback). Điều người dùng thực sự
 * muốn là tải file về máy mình.
 *
 * An toàn: chỉ phục vụ file NẰM TRONG thư mục của chính người đó. Kiểm bằng
 * đường dẫn thật (realpath) nên liên kết mềm trỏ ra ngoài cũng bị chặn.
 */

import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'

/** Kiểu nội dung theo đuôi tệp — chỉ để trình duyệt hiển thị tên cho đẹp. */
const TYPES = {
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.log': 'text/plain; charset=utf-8', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.zip': 'application/zip',
}

function typeOf(name) {
  const dot = name.lastIndexOf('.')
  return (dot === -1 ? undefined : TYPES[name.slice(dot).toLowerCase()])
    ?? 'application/octet-stream'
}

/** Tên tệp an toàn cho header Content-Disposition (RFC 5987 cho tên tiếng Việt). */
function contentDisposition(name) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/**
 * Kiểu tệp an toàn để hiển thị THẲNG trong trình duyệt.
 *
 * Chỉ ảnh, PDF và văn bản thuần. Mọi thứ khác ép về text/plain: tệp do trợ lý
 * hoặc người dùng tạo có thể là HTML/SVG chứa mã, mở inline trên chính tên miền
 * của trợ lý là mở đường cho chèn mã độc lấy phiên đăng nhập.
 */
const INLINE_SAFE = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain; charset=utf-8',
])

/**
 * Phục vụ một lượt tải file.
 *
 * @param req - request đã qua xác thực
 * @param res - response
 * @param userRoot - thư mục gốc của người đang đăng nhập (đường dẫn thật)
 * @param rawPath - đường dẫn file người dùng yêu cầu
 * @param inline - true thì hiển thị thẳng trong trình duyệt thay vì tải về.
 *   Dùng cho trường hợp trợ lý muốn CHO XEM ảnh ngay trong khung chat.
 */
export async function serveDownload(req, res, userRoot, rawPath, inline = false) {
  const fail = (code, message) => {
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
    res.end(message)
  }

  if (typeof rawPath !== 'string' || rawPath === '') return fail(400, 'Thiếu đường dẫn tệp.')

  let root
  let target
  try {
    // realpath cho CẢ hai vế: so sánh chuỗi thô thì một liên kết mềm trỏ ra
    // ngoài vẫn lọt qua.
    root = await realpath(userRoot)
    target = await realpath(rawPath)
  } catch {
    return fail(404, 'Không tìm thấy tệp.')
  }

  if (target !== root && !target.startsWith(root + sep)) {
    // Không nói rõ là "ngoài phạm vi" — đừng giúp người dò biết tệp nào tồn tại
    return fail(404, 'Không tìm thấy tệp.')
  }

  let info
  try {
    info = await stat(target)
  } catch {
    return fail(404, 'Không tìm thấy tệp.')
  }
  if (info.isDirectory()) return fail(400, 'Đây là thư mục, không phải tệp.')
  if (!info.isFile()) return fail(400, 'Chỉ tải được tệp thường.')

  const name = basename(target)
  const declared = typeOf(name)
  // Xem inline: chỉ cho kiểu an toàn, còn lại ép về văn bản thuần
  const type = inline && !INLINE_SAFE.has(declared) ? 'text/plain; charset=utf-8' : declared
  res.writeHead(200, {
    'content-type': type,
    'content-length': String(info.size),
    'content-disposition': inline
      ? `inline; filename="${name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')}"`
      : contentDisposition(name),
    'cache-control': 'no-store',
    // Tệp do người dùng tạo: đừng để trình duyệt đoán kiểu rồi chạy như HTML
    'x-content-type-options': 'nosniff',
    // Lớp chặn thứ hai cho đường xem inline: kể cả lọt một kiểu chạy được thì
    // trang cũng không có quyền gì trên tên miền của trợ lý.
    'content-security-policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
  })

  const stream = createReadStream(target)
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

/** Thư mục gốc của một người dùng, dùng chung cách đặt tên với instances.mjs. */
export function userRootFor(homesRoot, slug) {
  return join(homesRoot, slug)
}
