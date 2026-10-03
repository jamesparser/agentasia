import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { generateKeyPairSync, createSign } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mintDevToken, verifyDevToken, verifyFirebaseIdToken, authenticate, resetCertCache } from '../src/auth.mjs'
import { assertSearchAllowance, recordSearch, resolvePlan, assertWithinAllowance, recordUsage, usageReport, setPlan, betaState } from '../src/entitlements.mjs'

const SECRET = 'test-secret-not-real'
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function tmpEnv(extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'ent-'))
  return { PLANS_FILE: join(dir, 'plans.json'), USAGE_FILE: join(dir, 'usage.json'), ...extra }
}

test('dev token round-trips and rejects tampering, expiry and a wrong secret', () => {
  const tok = mintDevToken({ uid: 'u1', email: 'a@b.test' }, SECRET)
  assert.equal(verifyDevToken(tok, SECRET).uid, 'dev:u1')
  const [h, p, s] = tok.split('.')
  const forged = `${h}.${b64u(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), sub: 'admin' }))}.${s}`
  assert.throws(() => verifyDevToken(forged, SECRET), /bad_signature/)
  assert.throws(() => verifyDevToken(tok, 'other'), /bad_signature/)
  const old = mintDevToken({ uid: 'u1', ttlSeconds: 10 }, SECRET, Date.now() - 3_600_000)
  assert.throws(() => verifyDevToken(old, SECRET), /token_expired/)
  assert.throws(() => verifyDevToken(tok, ''), /dev_auth_disabled/)
})

function firebaseToken(privateKey, claims, kid = 'k1') {
  const head = b64u(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }))
  const body = b64u(JSON.stringify(claims))
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(privateKey)
  return `${head}.${body}.${b64u(sig)}`
}

test('firebase id token: valid, wrong audience, wrong issuer, bad signature, expired', async () => {
  resetCertCache()
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pem = publicKey.export({ type: 'spki', format: 'pem' })
  const fetchImpl = async () => ({ ok: true, headers: new Headers({ 'cache-control': 'max-age=100' }), json: async () => ({ k1: pem }) })
  const now = Date.now(), sec = Math.floor(now / 1000)
  const good = { iss: 'https://securetoken.google.com/proj', aud: 'proj', sub: 'uid-9', iat: sec, exp: sec + 3600, email: 'x@y.test', email_verified: true, firebase: { sign_in_provider: 'google.com' } }
  const opts = { projectId: 'proj', fetchImpl, now }
  const who = await verifyFirebaseIdToken(firebaseToken(privateKey, good), opts)
  assert.deepEqual([who.uid, who.provider, who.emailVerified], ['uid-9', 'google.com', true])
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(privateKey, { ...good, aud: 'other' }), opts), /bad_audience/)
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(privateKey, { ...good, iss: 'https://evil.test' }), opts), /bad_issuer/)
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(privateKey, { ...good, exp: sec - 4000 }), opts), /token_expired/)
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(other, good), opts), /bad_signature/)
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(privateKey, good, 'nokid'), opts), /unknown_key/)
  await assert.rejects(verifyFirebaseIdToken(firebaseToken(privateKey, good), { ...opts, projectId: '' }), /auth_not_configured/)
})

test('authenticate: no header is anonymous, a bad token is a 401 not anonymous', async () => {
  const env = { GATEWAY_DEV_AUTH_SECRET: SECRET }
  assert.equal(await authenticate({ headers: {} }, env), null)
  await assert.rejects(authenticate({ headers: { authorization: 'Bearer garbage' } }, env), /malformed_token/)
  const tok = mintDevToken({ uid: 'z' }, SECRET)
  assert.equal((await authenticate({ headers: { authorization: `Bearer ${tok}` } }, env)).uid, 'dev:z')
})

test('plan resolves from the server store and paid tiers stay off by default', async () => {
  const env = await tmpEnv()
  await setPlan('dev:u', 'enterprise', {}, env)
  assert.equal((await resolvePlan('dev:u', env)).plan, 'free', 'paid tiers disabled: store is ignored')
  const on = { ...env, PAID_TIERS_ENABLED: 'true' }
  const ent = await resolvePlan('dev:u', on)
  assert.equal(ent.plan, 'enterprise')
  assert.match(ent.model, /Ultra/)
  await setPlan('dev:u', 'pro', { until: '2000-01-01T00:00:00Z' }, env)
  assert.equal((await resolvePlan('dev:u', on)).plan, 'free', 'expired plan falls back to free')
  await assert.rejects(setPlan('dev:u', 'platinum', {}, env), /unknown_plan/)
})

test('beta window: active before 25 Dec 2026 (Phnom Penh), over after', () => {
  assert.equal(betaState({}, Date.parse('2026-12-24T12:00:00Z')).active, true)
  assert.equal(betaState({}, Date.parse('2026-12-25T00:00:00Z')).active, false)
})

test('allowance is per uid, per day, and survives concurrent writes', async () => {
  const env = await tmpEnv()
  const ent = await resolvePlan('dev:a', env)
  await Promise.all(Array.from({ length: 20 }, () => recordUsage('dev:a', { total_tokens: 10 }, env)))
  const rep = await usageReport({ uid: 'dev:a' }, env)
  assert.deepEqual(rep.used, { requests: 20, tokens: 200, searches: 0, audio: 0 })
  assert.equal((await usageReport({ uid: 'dev:b' }, env)).used.requests, 0)
  for (let i = 0; i < ent.dailyRequests - 20; i += 1) await recordUsage('dev:a', {}, env)
  await assert.rejects(assertWithinAllowance('dev:a', ent, env), (e) => e.statusCode === 429 && e.allowance.plan === 'free')
  const tomorrow = Date.now() + 86_400_000
  await assert.doesNotReject(assertWithinAllowance('dev:a', ent, env, tomorrow))
})

// ── black box: the real entry point ─────────────────────────────
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.mjs')
async function boot(env) {
  const port = 22000 + (process.pid % 900) + Math.floor(Math.random() * 90)
  const child = spawn(process.execPath, [SRC], { env: { ...env, PORT: String(port), BIND_HOST: '127.0.0.1' }, stdio: 'ignore' })
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(`${base}/healthz`)).ok) return { base, child } } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 50))
  }
  child.kill('SIGKILL'); throw new Error('gateway did not start')
}

test('gateway: sign-in required, usage is per caller, allowance is enforced before Nebius', async () => {
  const env = await tmpEnv({
    MODEL_GATEWAY_ENABLED: 'true', AUTH_REQUIRED: 'true', GATEWAY_DEV_AUTH_SECRET: SECRET,
    GATEWAY_ADMIN_TOKEN: 'admin-test', PAID_TIERS_ENABLED: 'false',
  })
  await writeFile(env.USAGE_FILE, JSON.stringify({ 'dev:full': { [new Date().toISOString().slice(0, 10)]: { requests: 9999, tokens: 0 } } }))
  const g = await boot(env)
  try {
    const chat = (headers = {}) => fetch(`${g.base}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ model: 'nvidia/Nemotron-3-Ultra-550b-a55b', messages: [{ role: 'user', content: 'hi' }] }) })
    assert.equal((await chat()).status, 401)
    assert.equal((await chat({ authorization: 'Bearer nonsense' })).status, 401)

    const sess = await (await fetch(`${g.base}/v1/dev/session`, { method: 'POST', body: JSON.stringify({ email: 'full' }) })).json()
    assert.equal(sess.uid, 'dev:full')
    const full = await chat({ authorization: `Bearer ${sess.token}` })
    assert.equal(full.status, 429, 'exhausted allowance stops before the provider is contacted')
    assert.equal((await full.json()).error.type, 'allowance')

    const other = await (await fetch(`${g.base}/v1/dev/session`, { method: 'POST', body: JSON.stringify({ email: 'fresh' }) })).json()
    const rep = await (await fetch(`${g.base}/v1/usage`, { headers: { authorization: `Bearer ${other.token}` } })).json()
    assert.equal(rep.plan, 'free'); assert.equal(rep.used.requests, 0); assert.equal(rep.signedIn, true)
    assert.match(rep.model, /Nano/)

    const anon = await fetch(`${g.base}/v1/usage`)
    assert.equal(anon.status, 200); assert.equal((await anon.json()).signedIn, false)

    // plan edits need the operator token, and are inert while paid tiers are off
    const put = (h) => fetch(`${g.base}/v1/admin/plan/${encodeURIComponent(other.uid)}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify({ plan: 'enterprise' }) })
    assert.equal((await put({})).status, 401)
    assert.equal((await put({ authorization: 'Bearer admin-test' })).status, 200)
    const after = await (await fetch(`${g.base}/v1/usage`, { headers: { authorization: `Bearer ${other.token}` } })).json()
    assert.equal(after.plan, 'free')
  } finally { g.child.kill('SIGKILL') }
})

test('gateway: dev session route does not exist without the secret', async () => {
  const env = await tmpEnv({ MODEL_GATEWAY_ENABLED: 'true', GATEWAY_ADMIN_TOKEN: 'x' })
  const g = await boot(env)
  try { assert.equal((await fetch(`${g.base}/v1/dev/session`, { method: 'POST', body: '{}' })).status, 404) } finally { g.child.kill('SIGKILL') }
})

test('free plan gets web search, capped at 25 a day per user', async () => {
  const env = await tmpEnv()
  const ent = await resolvePlan('s1', env)
  assert.equal(ent.dailySearches, 25)
  for (let i = 0; i < 25; i += 1) {
    await assertSearchAllowance('s1', ent, env)
    await recordSearch('s1', env)
  }
  await assert.rejects(assertSearchAllowance('s1', ent, env), (e) => e.statusCode === 429 && e.message === 'daily_search_allowance_reached')
  await assertSearchAllowance('s2', ent, env)
})
