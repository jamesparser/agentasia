import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Black-box test of the real entry point: the gateway is published to the
// internet through a tunnel, so everything the browser app does not call must be
// closed. Spawning `node src/index.mjs` covers the production startup path
// (including the GATEWAY_BASE_PATH strip) instead of a re-implemented handler.

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.mjs')

async function startServer(env) {
  const port = 21000 + (process.pid % 900)
  const child = spawn(process.execPath, [SRC], {
    env: { ...env, PORT: String(port), BIND_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (c) => (stderr += c))
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${base}/healthz`)
      if (r.ok) return { base, child, port }
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  child.kill('SIGKILL')
  throw new Error(`gateway did not come up: ${stderr.slice(0, 400)}`)
}

async function stop({ child }) {
  child.kill('SIGKILL')
  await new Promise((r) => setTimeout(r, 50))
}

const gated = (code) => code === 401 || code === 403 || code === 503

// ── 1. No token configured: privileged routes fail closed, public ones work ──
{
  const s = await startServer({})
  const health = await fetch(`${s.base}/healthz`)
  assert.equal(health.status, 200, '/healthz stays open for tunnel probes')

  // The submission tells judges to verify Nebius routing from response headers.
  // x-agentasia-* are set on the response, but a header the server does not list
  // in Access-Control-Expose-Headers is invisible to fetch(), so the advertised
  // check returns null and reads as a false claim. Pinned here because the
  // failure mode is silent and the symptom looks like a lie in the docs.
  const exposed = String(
    health.headers.get('access-control-expose-headers') || '',
  )
    .split(',')
    .map((h) => h.trim().toLowerCase())
  assert.ok(exposed.includes('x-agentasia-provider'), 'provider header must be readable from the browser')
  assert.ok(exposed.includes('x-agentasia-model'), 'model header must be readable from the browser')

  // The route the browser app actually calls must not be gated. It may still
  // answer 503 gateway_disabled because MODEL_GATEWAY_ENABLED is unset here;
  // what must not happen is an admin rejection.
  const chat = await fetch(`${s.base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'nvidia/nemotron-3-nano-30b-a3b', messages: [{ role: 'user', content: 'hi' }] }),
  })
  const chatBody = await chat.json()
  assert.ok(!String(chatBody.error || '').startsWith('admin_'), `chat route was gated: ${chatBody.error}`)

  const memoryPolicy = await fetch(`${s.base}/v1/memory/policy`)
  assert.equal(memoryPolicy.status, 200, 'memory policy is a public promise, not an admin secret')
  assert.equal((await memoryPolicy.json()).hostedByAgentAsia, false)

  for (const [method, path] of [
    ['GET', '/v1/spend'],
    ['GET', '/v1/config'],
    ['GET', '/v1/providers/dynamic'],
    ['POST', '/v1/providers'],
    ['DELETE', '/v1/providers/nebius'],
    ['GET', '/v1/providers/health'],
    ['POST', '/v1/memory'],
  ]) {
    const r = await fetch(`${s.base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
    })
    assert.ok(gated(r.status), `${method} ${path} returned ${r.status}, expected a refusal`)
    const body = await r.json()
    assert.equal(body.error, 'admin_not_configured', `${path} must fail closed, not open`)
  }

  // Two route families are deliberately not admin gated, because the browser app
  // calls them for the signed-in caller and they are metered per uid instead.
  // They still have to refuse rather than act or spend:
  //   /v1/search    => 503 tavily_not_configured with no Tavily key
  //   /v1/schedules => 503 scheduler_disabled until SCHEDULER_ENABLED is set,
  //                    and 401 sign_in_required with no caller token once it is
  // (the scheduler-on path is covered in schedules.test.mjs). Pinned separately
  // because folding them into the admin list above asserts a contract these routes
  // were never meant to have, and hides the refusal that actually matters.
  const search = await fetch(`${s.base}/v1/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(search.status, 503, '/v1/search must refuse when Tavily is not configured')
  assert.equal((await search.json()).error, 'tavily_not_configured')

  for (const [method, path] of [['GET', '/v1/schedules'], ['POST', '/v1/schedules']]) {
    const r = await fetch(`${s.base}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : '{}',
    })
    assert.equal(r.status, 503, `${method} ${path} must refuse while the scheduler is off`)
    assert.equal((await r.json()).error, 'scheduler_disabled')
  }
  await stop(s)
  console.log('  [1] unconfigured token => privileged routes fail closed, public routes reachable')
}

// ── 2. Token configured: bearer required, wrong bearer rejected ──────────────
{
  const token = 'test-admin-token-abcdefghij'
  const s = await startServer({ GATEWAY_ADMIN_TOKEN: token })

  const anon = await fetch(`${s.base}/v1/spend`)
  assert.equal(anon.status, 401, 'no header => 401')
  assert.equal((await anon.json()).error, 'admin_token_required')

  const wrong = await fetch(`${s.base}/v1/spend`, { headers: { authorization: 'Bearer nope' } })
  assert.equal(wrong.status, 401, 'wrong token => 401')
  assert.equal((await wrong.json()).error, 'admin_token_invalid')

  const prefixOnly = await fetch(`${s.base}/v1/spend`, { headers: { authorization: token } })
  assert.equal(prefixOnly.status, 401, 'raw token without Bearer scheme => 401')

  const right = await fetch(`${s.base}/v1/spend`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(right.status, 200, 'correct token => 200')
  assert.ok(await right.json(), 'operator payload returned')

  const cfg = await fetch(`${s.base}/v1/config`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(cfg.status, 200, 'config readable with the token')

  // public surface is unaffected by the token existing
  assert.equal((await fetch(`${s.base}/healthz`)).status, 200)
  await stop(s)
  console.log('  [2] configured token => 401 without/with wrong bearer, 200 with the right one')
}

// ── 3. Mounted under a base path: guard applies after the prefix strip ───────
{
  const token = 'test-admin-token-abcdefghij'
  const s = await startServer({ GATEWAY_ADMIN_TOKEN: token, GATEWAY_BASE_PATH: '/v1/agentasia' })

  // bare paths are not the app's routes at all under a prefix
  const bare = await fetch(`${s.base}/v1/spend`)
  assert.notEqual(bare.status, 200, 'bare privileged path must not serve while prefix-mounted')

  const prefixedHealth = await fetch(`${s.base}/v1/agentasia/healthz`)
  assert.equal(prefixedHealth.status, 200, 'prefixed /healthz is public')

  const gatedPrefixed = await fetch(`${s.base}/v1/agentasia/v1/spend`)
  assert.equal(gatedPrefixed.status, 401, 'prefixed privileged path still gated')

  const okPrefixed = await fetch(`${s.base}/v1/agentasia/v1/spend`, {
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(okPrefixed.status, 200, 'prefixed privileged path works with the token')

  const chat = await fetch(`${s.base}/v1/agentasia/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  })
  const body = await chat.json()
  assert.ok(!String(body.error || '').startsWith('admin_'), `prefixed chat was gated: ${body.error}`)
  await stop(s)
  console.log('  [3] GATEWAY_BASE_PATH mount => guard applies after the strip, chat stays public')
}

console.log('gateway-auth tests passed (public surface = /healthz + /v1/chat/completions, everything else needs GATEWAY_ADMIN_TOKEN)')
