import assert from 'node:assert/strict'
import { checkTarget, relayMcp, relayAllowed } from '../src/mcp-relay.mjs'

const rejects = async (fn, status, label) => {
  try { await fn() } catch (e) { assert.equal(e.statusCode, status, label); return }
  assert.fail(`${label}: expected rejection`)
}

// Targets: https and allow-listed hosts only.
checkTarget('https://docs.mcp.cloudflare.com/mcp')
for (const [u, s] of [
  ['http://docs.mcp.cloudflare.com/mcp', 400],
  ['https://evil.example.com/mcp', 403],
  ['https://127.0.0.1/mcp', 403],
  ['https://169.254.169.254/latest', 403],
  ['https://mcp.zapier.com:8443/x', 400],
  ['https://user:pw@mcp.zapier.com/x', 400],
  ['not a url', 400],
]) await rejects(async () => checkTarget(u), s, u)

// A host can be added by the operator, nothing else can.
checkTarget('https://mcp.extra.test/mcp', { MCP_RELAY_HOSTS: 'mcp.extra.test' })

// Only the short header list is forwarded; origin and cookies are dropped.
let seen
const fake = async (url, init) => {
  seen = { url: String(url), init }
  return { status: 200, headers: new Headers({ 'content-type': 'application/json', 'mcp-session-id': 's1' }), body: (async function* () { yield Buffer.from('{"ok":true}') })() }
}
const out = await relayMcp({ url: 'https://mcp.zapier.com/api/mcp/mcp', headers: { Authorization: 'Bearer x', Origin: 'https://agentasia.vercel.app', Cookie: 'a=b', 'Mcp-Session-Id': 'abc' }, body: '{}' }, {}, fake)
assert.equal(out.status, 200)
assert.equal(out.sessionId, 's1')
assert.equal(out.body.toString(), '{"ok":true}')
assert.deepEqual(Object.keys(seen.init.headers).sort(), ['authorization', 'mcp-session-id'])
assert.equal(seen.init.redirect, 'manual')

// Redirects are refused, oversized requests are refused.
await rejects(() => relayMcp({ url: 'https://mcp.zapier.com/x', body: '{}' }, {}, async () => ({ status: 302, headers: new Headers(), body: [] })), 502, 'redirect')
await rejects(() => relayMcp({ url: 'https://mcp.zapier.com/x', body: 'x'.repeat(1_000_001) }, {}, fake), 413, 'too large')

// Per caller limit.
let ok = 0
for (let i = 0; i < 70; i++) if (relayAllowed('u1', 1_000)) ok++
assert.equal(ok, 60)
assert.equal(relayAllowed('u1', 1_000 + 60_001), true)
console.log('mcp-relay tests passed')
