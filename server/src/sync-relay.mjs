// Sync relay for AgentAsia's end to end encrypted cross-device sync.
//
// Devices of one account connect to a room and exchange Yjs messages that the
// browser has already encrypted (AES-GCM, key derived from the user's sync
// password; see src/lib/yjs/encrypted-ws.ts). This server never has the key. It
// forwards each frame to the other devices in the room and keeps the frames
// marked durable, so a device that joins later, while the others are off, still
// receives the document content.
//
// Every frame is [kind][ciphertext]. kind 1 = durable (Yjs sync step 2 or
// update), kind 0 = ephemeral (awareness, queries, step 1). Only kind 1 is
// stored. The relay learns the room name (an opaque hash), frame sizes and
// timing. It learns nothing about the content.
//
// No dependencies: a small RFC 6455 server over node:http upgrade, so the
// gateway keeps its zero dependency footprint.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, stat, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const ROOM_RE = /^[A-Za-z0-9_-]{16,128}$/

export const LIMITS = {
  maxFrameBytes: 8 * 1024 * 1024,
  roomStoreBytes: 100 * 1024 * 1024,
  maxRooms: 5000,
  maxConnsPerIp: 30,
  roomIdleDays: 90,
}

const rooms = new Map()
const connsByIp = new Map()
const persistTimers = new Map()

const dirOf = (env) => env.SYNC_DIR || new URL('../../data/sync/', import.meta.url).pathname
const fileOf = (env, name) => join(dirOf(env), `${name}.bin`)

function encodeLog(frames) {
  const parts = []
  for (const f of frames) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(f.length)
    parts.push(len, f)
  }
  return Buffer.concat(parts)
}

function decodeLog(buf) {
  const frames = []
  let o = 0
  while (o + 4 <= buf.length) {
    const len = buf.readUInt32BE(o)
    o += 4
    if (len > LIMITS.maxFrameBytes || o + len > buf.length) break
    frames.push(buf.subarray(o, o + len))
    o += len
  }
  return frames
}

async function loadRoom(name, env) {
  let room = rooms.get(name)
  if (room) return room
  if (rooms.size >= LIMITS.maxRooms) return null
  let frames = []
  try { frames = decodeLog(await readFile(fileOf(env, name))) } catch { /* new room */ }
  room = { name, clients: new Set(), frames, bytes: frames.reduce((n, f) => n + f.length, 0) }
  rooms.set(name, room)
  return room
}

function schedulePersist(room, env) {
  if (persistTimers.has(room.name)) return
  persistTimers.set(room.name, setTimeout(async () => {
    persistTimers.delete(room.name)
    try {
      await mkdir(dirOf(env), { recursive: true })
      const tmp = `${fileOf(env, room.name)}.tmp`
      await writeFile(tmp, encodeLog(room.frames))
      await rename(tmp, fileOf(env, room.name))
    } catch { /* best effort: live relaying does not depend on disk */ }
    if (room.clients.size === 0) rooms.delete(room.name)
  }, 1500))
}

/** Remove rooms nobody has written to for a long time. Run at start up. */
export async function pruneIdleRooms(env = process.env, now = Date.now()) {
  let removed = 0
  try {
    for (const f of await readdir(dirOf(env))) {
      if (!f.endsWith('.bin')) continue
      const p = join(dirOf(env), f)
      const st = await stat(p)
      if (now - st.mtimeMs > LIMITS.roomIdleDays * 86_400_000) { await unlink(p); removed += 1 }
    }
  } catch { /* directory not created yet */ }
  return removed
}

// ── minimal WebSocket framing ───────────────────────────────────────────────
function frameOut(opcode, payload) {
  const len = payload.length
  let head
  if (len < 126) head = Buffer.from([0x80 | opcode, len])
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2) }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2) }
  return Buffer.concat([head, payload])
}

/** Pull complete frames out of `buf`. Returns [frames, rest] or throws on a bad frame. */
export function parseFrames(buf, maxBytes = LIMITS.maxFrameBytes) {
  const out = []
  let o = 0
  for (;;) {
    if (buf.length - o < 2) break
    const b0 = buf[o]
    const b1 = buf[o + 1]
    const masked = (b1 & 0x80) !== 0
    let len = b1 & 0x7f
    let p = o + 2
    if (len === 126) { if (buf.length - p < 2) break; len = buf.readUInt16BE(p); p += 2 }
    else if (len === 127) {
      if (buf.length - p < 8) break
      const big = buf.readBigUInt64BE(p)
      if (big > BigInt(maxBytes)) throw Object.assign(new Error('too_large'), { code: 1009 })
      len = Number(big); p += 8
    }
    if (len > maxBytes) throw Object.assign(new Error('too_large'), { code: 1009 })
    if (!masked) throw Object.assign(new Error('unmasked_client_frame'), { code: 1002 })
    if (buf.length - p < 4 + len) break
    const mask = buf.subarray(p, p + 4)
    const data = Buffer.from(buf.subarray(p + 4, p + 4 + len))
    for (let i = 0; i < data.length; i += 1) data[i] ^= mask[i & 3]
    out.push({ fin: (b0 & 0x80) !== 0, opcode: b0 & 0x0f, data })
    o = p + 4 + len
  }
  return [out, buf.subarray(o)]
}

function close(socket, code = 1000) {
  try {
    const p = Buffer.alloc(2)
    p.writeUInt16BE(code)
    socket.write(frameOut(0x8, p))
  } catch { /* already gone */ }
  socket.end()
}

/**
 * Handle one HTTP upgrade request. Returns true when the request was for the
 * relay (accepted or refused), false when it is not a relay path.
 */
export async function handleSyncUpgrade(req, socket, { env = process.env, originAllowed = () => true, prefix = '/v1/sync/' } = {}) {
  const url = new URL(req.url || '/', 'http://relay')
  if (!url.pathname.startsWith(prefix)) return false

  const refuse = (status, text) => {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
    socket.destroy()
    return true
  }

  const name = decodeURIComponent(url.pathname.slice(prefix.length))
  if (!ROOM_RE.test(name)) return refuse(400, 'Bad Request')
  const key = req.headers['sec-websocket-key']
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') return refuse(400, 'Bad Request')
  if (!originAllowed(req.headers.origin)) return refuse(403, 'Forbidden')

  const ip = String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '')
  const open = connsByIp.get(ip) || 0
  if (open >= LIMITS.maxConnsPerIp) return refuse(429, 'Too Many Requests')

  const room = await loadRoom(name, env)
  if (!room) return refuse(503, 'Service Unavailable')

  const accept = createHash('sha1').update(key + GUID).digest('base64')
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
  socket.setNoDelay(true)
  connsByIp.set(ip, open + 1)

  // A device that joins gets everything durable the room has kept.
  for (const f of room.frames) socket.write(frameOut(0x2, f))
  const client = { socket }
  room.clients.add(client)

  let pending = Buffer.alloc(0)
  let message = []
  let messageBytes = 0

  const onMessage = (data) => {
    if (data.length < 1) return
    for (const other of room.clients) if (other !== client) other.socket.write(frameOut(0x2, data))
    if (data[0] === 1) {
      room.frames.push(data)
      room.bytes += data.length
      while (room.bytes > LIMITS.roomStoreBytes && room.frames.length > 1) room.bytes -= room.frames.shift().length
      schedulePersist(room, env)
    }
  }

  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk])
    let frames
    try { [frames, pending] = parseFrames(pending) } catch (error) { return close(socket, error.code || 1002) }
    for (const f of frames) {
      if (f.opcode === 0x8) return close(socket, 1000)
      if (f.opcode === 0x9) { socket.write(frameOut(0xa, f.data)); continue }
      if (f.opcode === 0xa) continue
      if (f.opcode === 0x1 || f.opcode === 0x2 || f.opcode === 0x0) {
        message.push(f.data)
        messageBytes += f.data.length
        if (messageBytes > LIMITS.maxFrameBytes) return close(socket, 1009)
        if (f.fin) { onMessage(Buffer.concat(message)); message = []; messageBytes = 0 }
      }
    }
  })
  const done = () => {
    if (!room.clients.delete(client)) return
    connsByIp.set(ip, Math.max(0, (connsByIp.get(ip) || 1) - 1))
    // Frames stay on disk. Keep the room in memory until its last write landed,
    // otherwise a quick rejoin would read a stale file.
    if (room.clients.size === 0 && !persistTimers.has(room.name)) rooms.delete(room.name)
  }
  socket.on('close', done)
  socket.on('error', done)
  return true
}

export const _test = { rooms, connsByIp }
