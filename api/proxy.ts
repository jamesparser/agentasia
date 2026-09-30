/**
 * Same-origin CORS proxy for the skill registries.
 *
 * Replaces the dependency on `https://proxy.devs.new` (the upstream product's
 * service), which rejected every request from `agentasia.vercel.app` with
 * `403 Forbidden: Invalid origin` — so skill search was dead in the deployed
 * build — and would have shipped user search queries through their
 * infrastructure. All rules live in `validateProxyTarget` (SSRF allow-list),
 * which is unit-tested without a server.
 *
 * Deliberately minimal: GET only, no cookies, no Authorization from the caller,
 * no redirect following (a permitted host could 302 to an internal one), size
 * cap, and a timeout.
 */
import { validateProxyTarget } from '../src/lib/skills/proxy-target'

const MAX_BYTES = 6 * 1024 * 1024

const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname
  } catch {
    return '?'
  }
}
const TIMEOUT_MS = 20_000

export default async function handler(request: Request): Promise<Response> {
  try {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const check = validateProxyTarget(url.searchParams.get('url'))
  if (!check.ok) {
    return json({ error: check.error }, check.status)
  }

  const target = check.url.toString()
  const upstream = await fetch(target, {
    method: 'GET',
    redirect: 'manual', // a 3xx to an internal address must not be followed here
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      accept: request.headers.get('accept') || 'application/json',
      'user-agent': 'AgentAsia/1.0 (same-origin fetch relay)',
    },
  }).catch((error: unknown) => {
    // The registry name is the only thing the user needs to act on, so the
    // message stays generic; `error` is logged rather than returned.
    console.warn('[proxy] upstream fetch failed', hostOf(target), String(error).slice(0, 160))
    return null
  })

  if (!upstream) {
    return json({ error: 'Upstream request failed' }, 502)
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    return json({ error: 'Redirects are not followed' }, 502)
  }

  const buf = await upstream.arrayBuffer().catch(() => null)
  if (!buf) {
    return json({ error: 'Upstream body unreadable' }, 502)
  }
  if (buf.byteLength > MAX_BYTES) {
    return json({ error: 'Upstream response too large' }, 502)
  }

  return new Response(buf, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') || 'application/octet-stream',
      // binary-safe: the ZIP download path needs bytes, not text
      'cache-control': 'no-store',
    },
  })
  } catch (error) {
    // Without this, any unexpected throw surfaced as Vercel's opaque 500 page with
    // nothing in the response saying why.
    const message = error instanceof Error ? error.message : String(error)
    console.error('[proxy] failed', message.slice(0, 200))
    return json({ error: 'Proxy request failed', detail: message.slice(0, 200) }, 502)
  }
}

/**
 * `Response.json()` is missing on some runtimes, which made every call throw.
 * Build the Response directly so this works on any Node version the platform
 * defaults to.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
