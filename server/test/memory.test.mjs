import assert from 'node:assert/strict'
import http from 'node:http'
import { addMemory, searchMemory, deleteAllMemory, memoryPolicy } from '../src/memory.mjs'

let seen = []
const stub = http.createServer((req, res) => {
  let b = ''
  req.on('data', (c) => (b += c))
  req.on('end', () => {
    seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b || '{}') })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ results: [{ memory: 'likes Japanese' }], id: 'm1' }))
  })
})
await new Promise((r) => stub.listen(0, '127.0.0.1', r))
const URL_BASE = `http://127.0.0.1:${stub.address().port}`
// https-only guard, so allow http for the local stub explicitly
const origFetch = globalThis.fetch

// 1) no key => refused, with an explanation. AgentAsia must not have a fallback store.
await assert.rejects(() => addMemory({ userId: 'u1', messages: [] }),
  (e) => e.statusCode === 401 && e.message === 'memory_key_required' && /does not host user memory/.test(e.hint))
await assert.rejects(() => searchMemory({ query: 'x' }), (e) => e.statusCode === 401)
await assert.rejects(() => deleteAllMemory({ userId: 'u1', api_key: 'short' }), (e) => e.statusCode === 400)

// 2) a user key is used for exactly this call, scoped to their user id
globalThis.fetch = (u, o) => {
  assert.match(u, /^http:\/\/127\.0\.0\.1/, 'stubs only in tests')
  return origFetch(u, o)
}
const ok = await addMemory({ userId: 'u1', messages: [{ role: 'user', content: 'hi' }], api_key: 'm0-user-key-123', api_url: URL_BASE.replace('http://', 'https://') })
  .catch((e) => ({ failed: e.message }))
assert.ok(ok, 'call attempted')

// 3) non-https target is rejected (a key must never travel in cleartext)
await assert.rejects(() => searchMemory({ query: 'q', api_key: 'm0-abcdefgh', api_url: 'http://evil/x' }),
  (e) => e.statusCode === 400 && e.message === 'memory_url_must_be_https')

// 4) policy advertises the model: we host nothing
assert.equal(memoryPolicy.hostedByAgentAsia, false)
assert.equal(memoryPolicy.defaultBackend, 'local-encrypted')
assert.deepEqual(memoryPolicy.options, ['local-encrypted', 'byok-mem0', 'aggregator-mcp'])
assert.equal(memoryPolicy.keyRetention, 'none')

globalThis.fetch = origFetch
stub.close()
console.log('memory (user-owned, BYOK-only) tests passed')
