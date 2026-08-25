/** BE giả: chỉ có /api/auth/admin/login, đúng mật khẩu duy nhất. */
import { createServer } from 'node:http'

export const GOOD = { email: 'admin@vhdcorp.com', password: 'dungmatkhau123' }

export function startFakeBe() {
  const server = createServer((req, res) => {
    if (req.url !== '/api/auth/admin/login' || req.method !== 'POST') {
      res.writeHead(404).end()
      return
    }
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      let body = {}
      try { body = JSON.parse(Buffer.concat(chunks).toString()) } catch {}
      if (body.email === GOOD.email && body.password === GOOD.password) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ statusCode: 200, success: true, data: { user: { email: GOOD.email } } }))
        return
      }
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ statusCode: 401, success: false, message: 'sai' }))
    })
  })
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` }))
  })
}
