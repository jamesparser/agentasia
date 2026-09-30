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
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const check = validateProxyTarget(url.searchParams.get('url'))
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status })
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
    return Response.json({ error: 'Upstream request failed' }, { status: 502 })
  }
  if (upstream.status >= 300 && upstream.status < 400) {
    return Response.json({ error: 'Redirects are not followed' }, { status: 502 })
  }

  const buf = await upstream.arrayBuffer().catch(() => null)
  if (!buf) {
    return Response.json({ error: 'Upstream body unreadable' }, { status: 502 })
  }
  if (buf.byteLength > MAX_BYTES) {
    return Response.json({ error: 'Upstream response too large' }, { status: 502 })
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
}
