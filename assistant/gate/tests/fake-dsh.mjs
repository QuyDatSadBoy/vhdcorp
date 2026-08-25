#!/usr/bin/env node
/** Trợ lý giả cho bài kiểm: nghe đúng --port và kể lại DSH_HOME + header nhận được. */
import { createServer } from 'node:http'

const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({
    home: process.env.DSH_HOME ?? null,
    workspace: process.env.VHD_WORKSPACE ?? null,
    cwd: process.cwd(),
    home: process.env.HOME ?? null,
    user: req.headers['x-vhd-user'] ?? null,
    cookie: req.headers.cookie ?? null,
    path: req.url,
    args: args.join(' '),
  }))
})
server.on('upgrade', (req, socket) => {
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
  socket.write(`user=${req.headers['x-vhd-user'] ?? ''}`)
})
server.listen(port, '127.0.0.1')
