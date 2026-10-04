/**
 * Minimal read-only ZIP extractor.
 *
 * ClawHub serves skills as a ZIP archive from `/api/v1/download`, and this app
 * has no archive dependency (and adding one for ~100 lines of well-understood
 * format parsing is not worth the bundle weight). Only what is needed is
 * implemented: the central directory for the file list, and *stored* plus
 * deflate entries inflated with the platform `DecompressionStream`.
 *
 * Parsing the central directory (rather than walking local headers) matters for
 * correctness: local headers can legitimately differ from the authoritative
 * record, and archives with data descriptors would otherwise be misread.
 *
 * Guards: entry count, path traversal (`..`, absolute paths, backslashes), and
 * per-entry and total uncompressed size, because this runs on bytes fetched
 * from a public registry.
 */

export interface ZipEntry {
  path: string
  data: Uint8Array
  text: () => string
}

export interface ZipReadOptions {
  maxEntries?: number
  maxEntryBytes?: number
  maxTotalBytes?: number
}

const EOCD_SIG = 0x02014b50 // local header signature used to find CD records
const EOCD_SEARCH = 0x06054b50
const DEFAULTS = {
  maxEntries: 500,
  maxEntryBytes: 4 * 1024 * 1024,
  maxTotalBytes: 12 * 1024 * 1024,
}

const dec = new TextDecoder()

function findEndOfCentral(buf: DataView): number {
  const min = Math.max(0, buf.byteLength - (22 + 0xffff))
  for (let i = buf.byteLength - 22; i >= min; i--) {
    if (buf.getUint32(i, true) === EOCD_SEARCH) return i
  }
  return -1
}

function safePath(name: string): string | null {
  const p = name.replace(/\\/g, '/')
  if (!p || p.startsWith('/') || p.includes('../') || p === '..' || /^[a-zA-Z]:/.test(p)) {
    return null
  }
  return p
}

async function inflate(method: number, bytes: Uint8Array): Promise<Uint8Array> {
  if (method === 0) return bytes
  if (method !== 8) throw new Error(`Unsupported zip compression method ${method}`)
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This browser cannot decompress zip archives')
  }
  // Pumped by hand rather than `new Blob(...).stream().pipeThrough(...)`:
  // Blob#stream is missing in some runtimes (jsdom), and piping through a
  // Response adds an allocation for no benefit.
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  // Write in background so the reader drains concurrently; a large entry must
  // not deadlock the pipe waiting for consumption.
  void writer.write(bytes).catch(() => undefined)
  void writer.close().catch(() => undefined)
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const piece = new Uint8Array(value)
    total += piece.byteLength
    chunks.push(piece)
    if (total > DEFAULTS.maxTotalBytes * 4) {
      throw new Error('Archive decompresses far beyond its declared sizes')
    }
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

export async function readZip(
  input: ArrayBuffer | Uint8Array,
  opts: ZipReadOptions = {},
): Promise<ZipEntry[]> {
  const limits = { ...DEFAULTS, ...opts }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.byteLength < 22) throw new Error('Not a zip archive (too small)')
  const buf = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const eocd = findEndOfCentral(buf)
  if (eocd < 0) throw new Error('Not a zip archive (no end of central directory)')
  const count = buf.getUint16(eocd + 10, true)
  let offset = buf.getUint32(eocd + 16, true)
  if (count > limits.maxEntries) {
    throw new Error(`Archive declares too many entries (${count})`)
  }

  const out: ZipEntry[] = []
  let total = 0
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buf.byteLength) throw new Error('Corrupt central directory')
    if (buf.getUint32(offset, true) !== EOCD_SIG) throw new Error('Bad central directory record')
    const method = buf.getUint16(offset + 10, true)
    const compSize = buf.getUint32(offset + 20, true)
    const uncompSize = buf.getUint32(offset + 24, true)
    const nameLen = buf.getUint16(offset + 28, true)
    const extraLen = buf.getUint16(offset + 30, true)
    const commentLen = buf.getUint16(offset + 32, true)
    const localOff = buf.getUint32(offset + 42, true)
    const name = dec.decode(bytes.subarray(offset + 46, offset + 46 + nameLen))
    offset += 46 + nameLen + extraLen + commentLen

    if (name.endsWith('/')) continue // directory record
    const path = safePath(name)
    if (!path) throw new Error(`Unsafe path in archive: ${name}`)
    if (uncompSize > limits.maxEntryBytes) {
      throw new Error(`Entry too large: ${path} (${uncompSize} bytes)`)
    }
    total += uncompSize
    if (total > limits.maxTotalBytes) {
      throw new Error(`Archive decompresses to more than ${limits.maxTotalBytes} bytes`)
    }

    // Read the *local* header to find where this entry's data actually starts:
    // local extra fields may differ in length from the central directory's.
    if (localOff + 30 > buf.byteLength) throw new Error('Corrupt local header')
    if (buf.getUint32(localOff, true) !== 0x04034b50) throw new Error('Bad local header')
    const localExtra = buf.getUint16(localOff + 28, true)
    const localName = buf.getUint16(localOff + 26, true)
    const dataStart = localOff + 30 + localName + localExtra
    const slice = bytes.subarray(dataStart, dataStart + compSize)
    const data = await inflate(method, slice)
    out.push({ path, data, text: () => dec.decode(data) })
  }
  return out
}
