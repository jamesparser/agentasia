// Caller identity for the gateway.
//
// Two token kinds are accepted, and nothing else:
//   1. A Firebase ID token (RS256), verified against Google's published
//      certificates. This is the production path.
//   2. A dev token (HS256) signed with GATEWAY_DEV_AUTH_SECRET. It exists so the
//      whole entitlement path can be tested without an OAuth client. It is only
//      honoured when that secret is set, so a production deployment that never
//      sets it cannot be fed a forged principal.
//
// No dependencies: node:crypto is enough for both.
import { createHmac, createPublicKey, timingSafeEqual, verify as cryptoVerify } from 'node:crypto'

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
const SKEW_SECONDS = 300
let certCache = { certs: null, expiresAt: 0 }

const b64urlToBuf = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function decode(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw authError('malformed_token')
  try {
    return {
      header: JSON.parse(b64urlToBuf(parts[0]).toString('utf8')),
      payload: JSON.parse(b64urlToBuf(parts[1]).toString('utf8')),
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: b64urlToBuf(parts[2]),
    }
  } catch {
    throw authError('malformed_token')
  }
}

export function authError(code) {
  const e = new Error(code)
  e.code = code
  e.statusCode = 401
  return e
}

async function googleCerts(fetchImpl = fetch, now = Date.now()) {
  if (certCache.certs && certCache.expiresAt > now) return certCache.certs
  const res = await fetchImpl(CERT_URL)
  if (!res.ok) throw authError('cert_fetch_failed')
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1]) || 3600
  certCache = { certs: await res.json(), expiresAt: now + maxAge * 1000 }
  return certCache.certs
}

export function resetCertCache() { certCache = { certs: null, expiresAt: 0 } }

function checkClaims(p, { issuer, audience, nowSec }) {
  if (p.iss !== issuer) throw authError('bad_issuer')
  if (audience && p.aud !== audience) throw authError('bad_audience')
  if (typeof p.sub !== 'string' || !p.sub || p.sub.length > 128) throw authError('bad_subject')
  if (typeof p.exp !== 'number' || p.exp + SKEW_SECONDS < nowSec) throw authError('token_expired')
  if (typeof p.iat === 'number' && p.iat - SKEW_SECONDS > nowSec) throw authError('token_from_future')
}

/** Verify a Firebase ID token. Returns the principal or throws a 401 error. */
export async function verifyFirebaseIdToken(token, { projectId, fetchImpl, now = Date.now() } = {}) {
  if (!projectId) throw authError('auth_not_configured')
  const { header, payload, signingInput, signature } = decode(token)
  if (header.alg !== 'RS256' || !header.kid) throw authError('bad_algorithm')
  const certs = await googleCerts(fetchImpl, now)
  const pem = certs[header.kid]
  if (!pem) throw authError('unknown_key')
  const ok = cryptoVerify('RSA-SHA256', Buffer.from(signingInput), createPublicKey(pem), signature)
  if (!ok) throw authError('bad_signature')
  checkClaims(payload, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    nowSec: Math.floor(now / 1000),
  })
  return {
    uid: payload.sub,
    email: payload.email || null,
    emailVerified: payload.email_verified === true,
    provider: payload.firebase?.sign_in_provider || 'unknown',
    kind: 'firebase',
  }
}

export function mintDevToken({ uid, email = null, ttlSeconds = 3600 }, secret, now = Date.now()) {
  if (!secret) throw new Error('dev auth secret required')
  const iat = Math.floor(now / 1000)
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ iss: 'agentasia-dev', sub: String(uid), email, iat, exp: iat + ttlSeconds }))
  const sig = b64url(createHmac('sha256', secret).update(`${head}.${body}`).digest())
  return `${head}.${body}.${sig}`
}

export function verifyDevToken(token, secret, now = Date.now()) {
  if (!secret) throw authError('dev_auth_disabled')
  const { header, payload, signingInput, signature } = decode(token)
  if (header.alg !== 'HS256') throw authError('bad_algorithm')
  const expected = createHmac('sha256', secret).update(signingInput).digest()
  if (expected.length !== signature.length || !timingSafeEqual(expected, signature)) throw authError('bad_signature')
  checkClaims(payload, { issuer: 'agentasia-dev', audience: null, nowSec: Math.floor(now / 1000) })
  return { uid: `dev:${payload.sub}`, email: payload.email || null, emailVerified: true, provider: 'dev', kind: 'dev' }
}

/**
 * Resolve the caller from an Authorization header. Returns null when no bearer
 * token was sent (an anonymous caller) and throws a 401 error when one was sent
 * and is invalid: a bad token must never silently downgrade to anonymous.
 */
export async function authenticate(req, env = process.env, deps = {}) {
  const header = String(req.headers.authorization || '')
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null
  const { header: h } = decode(token)
  if (h.alg === 'HS256') return verifyDevToken(token, (env.GATEWAY_DEV_AUTH_SECRET || '').trim(), deps.now)
  return verifyFirebaseIdToken(token, {
    projectId: (env.FIREBASE_PROJECT_ID || '').trim(),
    fetchImpl: deps.fetchImpl,
    now: deps.now,
  })
}
