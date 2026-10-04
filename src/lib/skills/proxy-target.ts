/**
 * Target validation for our same-origin CORS proxy (`/api/proxy`).
 *
 * The app used to call `https://proxy.devs.new/api/proxy` — somebody else's
 * service. Two problems with that, both measured on the deployed build:
 *
 *   1. it allow-lists `devs.new`/localhost origins, so every request from
 *      `agentasia.vercel.app` was answered `403 {"error":"Forbidden: Invalid
 *      origin"}` - SkillsMP skill search was simply broken in production; and
 *   2. if it *had* worked, every search a user typed would have been forwarded
 *      through the upstream product's infrastructure.
 *
 * So the proxy is now ours, and because a general-purpose fetch relay is an
 * SSRF gadget, the allow-list is the point of this file rather than a detail:
 * only the exact hosts the skill registries need, https only, and never a
 * literal private/loopback/link-local address even if it were on the list.
 *
 * Kept as a separate module so the rules are unit-testable without a server.
 */

/** Hosts the app legitimately needs to reach through the proxy. */
export const ALLOWED_PROXY_HOSTS: readonly string[] = [
  'skillsmp.com',
  'api.skillsmp.com',
  'clawhub.ai',
  'arxiv.org',
  'export.arxiv.org',
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
]

export type TargetCheck = { ok: true; url: URL } | { ok: false; status: number; error: string }

const isPrivateIPv4 = (host: string): boolean => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true // link-local + cloud metadata endpoint
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT / Tailscale range
  return false
}

const isPrivateIPv6Literal = (host: string): boolean => {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes(':')) return false
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true
  return /^::ffff:(10|127|192\.168|172\.1[6-9]|172\.2[0-9]|172\.3[01]|100\.6[4-9]|100\.[79]\d|100\.1[01]\d|100\.12[0-7])/.test(
    h,
  )
}

export function validateProxyTarget(raw: string | null | undefined): TargetCheck {
  if (!raw) return { ok: false, status: 400, error: 'Missing url parameter' }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, status: 400, error: 'Invalid url' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, status: 400, error: 'Only https URLs are allowed' }
  }

  const host = url.hostname.toLowerCase()
  if (isPrivateIPv4(host) || isPrivateIPv6Literal(host)) {
    return { ok: false, status: 403, error: 'Private addresses are not allowed' }
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, status: 403, error: 'Private hosts are not allowed' }
  }

  const allowed = ALLOWED_PROXY_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  )
  if (!allowed) {
    return { ok: false, status: 403, error: `Host not allowed: ${host}` }
  }

  return { ok: true, url }
}
