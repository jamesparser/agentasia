// MCP relay. Some MCP servers refuse requests that come from a web page (no CORS
// for our origin, or an explicit origin check), so a browser cannot reach them.
// This forwards one JSON-RPC call from a signed-in user to such a server and
// returns the answer.
//
// What it is, plainly: the user's own key for that server passes through this
// process on its way out. It is held in memory for the length of one request,
// never written to disk or logged. That is the trade for making these servers
// work, and the privacy page says so.
//
// What it is not: an open proxy. Only https, only hosts on the allow list, no
// redirects followed, no caller supplied headers beyond a short list, bounded
// request and response size, bounded time.
const DEFAULT_HOSTS = [
  'docs.mcp.cloudflare.com',
  'mcp.zapier.com',
  'mcp.mem0.ai',
]

const FORWARD_HEADERS = ['authorization', 'accept', 'content-type', 'mcp-session-id', 'mcp-protocol-version']
const MAX_REQUEST_BYTES = 1_000_000
const MAX_RESPONSE_BYTES = 4_000_000
const TIMEOUT_MS = 30_000

export function relayHosts(env = process.env) {
  const extra = String(env.MCP_RELAY_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return new Set([...DEFAULT_HOSTS, ...extra])
}

function fail(statusCode, message) {
  return Object.assign(new Error(message), { statusCode })
}

export function checkTarget(rawUrl, env = process.env) {
  let url
  try { url = new URL(String(rawUrl)) } catch { throw fail(400, 'invalid_url') }
  if (url.protocol !== 'https:') throw fail(400, 'https_required')
  if (url.port && url.port !== '443') throw fail(400, 'port_not_allowed')
  if (url.username || url.password) throw fail(400, 'credentials_in_url_not_allowed')
  if (!relayHosts(env).has(url.hostname.toLowerCase())) throw fail(403, 'host_not_allowed')
  return url
}

// A small per caller limiter so one account cannot turn the relay into a
// request cannon. In memory on purpose: it resets on restart and that is fine.
const buckets = new Map()
export function relayAllowed(uid, now = Date.now(), limit = 60) {
  const slot = buckets.get(uid)
  if (!slot || now - slot.start >= 60_000) {
    buckets.set(uid, { start: now, count: 1 })
    return true
  }
  slot.count += 1
  return slot.count <= limit
}

/**
 * @param {{url:string, headers?:Record<string,string>, body?:string}} input
 * @returns {Promise<{status:number, contentType:string, sessionId:string|null, body:Buffer}>}
 */
export async function relayMcp(input, env = process.env, fetchImpl = fetch) {
  const url = checkTarget(input?.url, env)
  const body = typeof input?.body === 'string' ? input.body : ''
  if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) throw fail(413, 'request_too_large')

  const headers = {}
  for (const [k, v] of Object.entries(input?.headers || {})) {
    const key = String(k).toLowerCase()
    if (FORWARD_HEADERS.includes(key) && typeof v === 'string' && v.length < 4096) headers[key] = v
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual', // a redirect could point somewhere off the allow list
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    throw fail(error?.name === 'AbortError' ? 504 : 502, error?.name === 'AbortError' ? 'upstream_timeout' : 'upstream_unreachable')
  }
  try {
    if (res.status >= 300 && res.status < 400) throw fail(502, 'upstream_redirect_refused')
    const chunks = []
    let size = 0
    for await (const chunk of res.body ?? []) {
      size += chunk.length
      if (size > MAX_RESPONSE_BYTES) throw fail(502, 'upstream_response_too_large')
      chunks.push(Buffer.from(chunk))
    }
    return {
      status: res.status,
      contentType: res.headers.get('content-type') || 'application/json',
      sessionId: res.headers.get('mcp-session-id'),
      body: Buffer.concat(chunks),
    }
  } finally {
    clearTimeout(timer)
  }
}
