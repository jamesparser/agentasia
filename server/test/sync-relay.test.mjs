import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleSyncUpgrade, parseFrames } from '../src/sync-relay.mjs'

const dir = await mkdtemp(join(tmpdir(), 'sync-relay-'))
const env = { SYNC_DIR: dir }
const server = http.createServer((req, res) => res.writeHead(404).end())
server.on('upgrade', (req, socket) => {
  socket.on('error', () => {})
  handleSyncUpgrade(req, socket, { env, originAllowed: (o) => o === 'https://app.test' })
    .then((h) => { if (!h) socket.destroy() })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port
const ROOM = 'a'.repeat(64)

const connect = (room = ROOM) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/v1/sync/${room}`)
  ws.binaryType = 'arraybuffer'
  ws.inbox = []
  ws.onmessage = (e) => ws.inbox.push(new Uint8Array(e.data))
  ws.onopen = () => resolve(ws)
  ws.onerror = () => reject(new Error('connect_failed'))
})
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms))

// The browser WebSocket client sends no Origin here, so it must be refused.
await assert.rejects(connect(), /connect_failed/)

// Same test with an allowed origin, using a raw upgrade request.
import net from 'node:net'
import { createHash, randomBytes } from 'node:crypto'
function rawClient(room = ROOM, origin = 'https://app.test') {
  return new Promise((resolve, reject) => {
    const key = randomBytes(16).toString('base64')
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(`GET /v1/sync/${room} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${origin}\r\n\r\n`)
    })
    let buf = Buffer.alloc(0)
    let upgraded = false
    const c = { sock, inbox: [], status: null }
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d])
      if (!upgraded) {
        const i = buf.indexOf('\r\n\r\n')
        if (i < 0) return
        const head = buf.subarray(0, i).toString()
        c.status = head.split(' ')[1]
        const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
        if (c.status === '101') assert.ok(head.includes(accept), 'accept key')
        buf = buf.subarray(i + 4)
        upgraded = true
        resolve(c)
      }
      // server frames are unmasked
      for (;;) {
        if (buf.length < 2) break
        let len = buf[1] & 0x7f; let p = 2
        if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); p = 4 }
        if (buf.length < p + len) break
        c.inbox.push(Uint8Array.from(buf.subarray(p, p + len)))
        buf = buf.subarray(p + len)
      }
    })
    sock.on('error', reject)
    c.send = (payload) => {
      const mask = randomBytes(4)
      const data = Buffer.from(payload)
      const masked = Buffer.from(data.map((b, i) => b ^ mask[i & 3]))
      const head = data.length < 126 ? Buffer.from([0x82, 0x80 | data.length]) : Buffer.from([0x82, 0x80 | 126, data.length >> 8, data.length & 255])
      sock.write(Buffer.concat([head, mask, masked]))
    }
  })
}

const refused = await rawClient(ROOM, 'https://evil.test')
assert.equal(refused.status, '403')
const badRoom = await rawClient('short', 'https://app.test')
assert.equal(badRoom.status, '400')

const a = await rawClient()
const b = await rawClient()
assert.equal(a.status, '101')

a.send([0, 9, 9, 9])            // ephemeral: forwarded, not kept
a.send([1, 7, 7, 7, 7])         // durable: forwarded and kept
await wait()
assert.deepEqual(b.inbox.map((x) => x[0]), [0, 1])
assert.equal(a.inbox.length, 0, 'sender does not get its own frames')

// A device that joins later gets the durable frame only.
const c = await rawClient()
await wait()
assert.deepEqual(c.inbox.map((x) => [...x]), [[1, 7, 7, 7, 7]])

// Room is another room: isolated.
const other = await rawClient('b'.repeat(64))
a.send([1, 1, 1, 1])
await wait()
assert.equal(other.inbox.length, 0)

// Frames are persisted for a restart.
await wait(1800)
assert.ok((await readdir(dir)).some((f) => f.endsWith('.bin')))

// Framing: an unmasked client frame is a protocol error.
assert.throws(() => parseFrames(Buffer.from([0x82, 0x01, 0x05])), /unmasked/)
// A frame that claims to be larger than the limit is refused before buffering.
assert.throws(() => parseFrames(Buffer.from([0x82, 0xff, 0, 0, 0, 0, 0x10, 0, 0, 0, 1, 2, 3, 4])), /too_large/)

for (const x of [a, b, c, other]) x.sock.destroy()
server.close()
console.log('sync-relay tests passed')
process.exit(0)
