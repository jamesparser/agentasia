import assert from 'node:assert/strict'
import http from 'node:http'
import { webSearch, searchConfigured, normaliseResult } from '../src/tools/websearch.mjs'

// Stub Tavily so tests run offline and never need a key.
const seen = []
const stub = http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    seen.push({ auth: req.headers.authorization, body: JSON.parse(raw) })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      answer: 'BTC is $84,511.',
      results: [{ title: 'CoinGecko', url: 'https://x', content: 'live price', score: 0.9123, published_date: '2026-09-28' }],
    }))
  })
})
await new Promise((r) => stub.listen(0, '127.0.0.1', r))
const port = stub.address().port
const origFetch = globalThis.fetch
globalThis.fetch = (url, opts) => origFetch(`http://127.0.0.1:${port}/search`, opts)

const env = { TAVILY_API_KEY: 'tvly-test' }
assert.equal(searchConfigured(env), true)
assert.equal(searchConfigured({}), false)

const out = await webSearch({ query: '  bitcoin price  ', maxResults: 99 }, env)
assert.equal(out.source, 'tavily')
assert.equal(out.query, 'bitcoin price', 'query is trimmed')
assert.equal(out.requiresCitation, true, 'spoken facts are marked citation-required')
assert.ok(typeof out.retrievedAt === 'string' && !Number.isNaN(Date.parse(out.retrievedAt)))
assert.equal(out.results.length, 1)
assert.equal(out.results[0].score, 0.912, 'score rounded')
assert.equal(out.results[0].publishedDate, '2026-09-28')
assert.equal(seen[0].auth, 'Bearer tvly-test', 'key sent as bearer, never logged')
assert.equal(seen[0].body.max_results, 20, 'max_results clamped to 20')
assert.equal(seen[0].body.include_answer, true)

globalThis.fetch = origFetch
await assert.rejects(() => webSearch({ query: '' }, env), /query_required/)
await assert.rejects(() => webSearch({ query: 'x' }, {}), /tavily_not_configured/)
assert.deepEqual(normaliseResult({}), { title: '', url: '', content: '', score: undefined, publishedDate: null })

stub.close()
console.log('websearch (Tavily) tests passed')
