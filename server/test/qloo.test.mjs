import assert from 'node:assert/strict'
import http from 'node:http'
import {
  culturalInsights,
  compactCultureForModel,
  cultureProfileFor,
  qlooConfigured,
  resolveTagIds,
  resolveEntityIds,
  CULTURE_PROFILES,
} from '../src/tools/qloo.mjs'

// ── culture map ─────────────────────────────────────────────────────────────
assert.equal(qlooConfigured({}), false)
assert.equal(qlooConfigured({ QLOO_API_KEY: 'qloo-test' }), true)

const km = cultureProfileFor('km')
assert.equal(km.region, 'Cambodia')
assert.ok(km.dining.some((d) => /khmer|cambodian/i.test(d)), 'km has Khmer dining seeds')
assert.ok(km.cityHints.includes('Phnom Penh'))

const ja = cultureProfileFor('ja')
assert.ok(ja.music.some((m) => /j-pop|anime/i.test(m)), 'ja has J-pop/anime seeds')

const fallback = cultureProfileFor('xx-unknown')
assert.equal(fallback.locale, 'en', 'unknown locales fall back to English profile')

const zh = cultureProfileFor('zh-Hans')
assert.equal(zh.countryCode, 'CN', 'zh-Hans maps to Simplified Chinese profile')

// ── Qloo stub matching live hackathon.api.qloo.com shapes ───────────────────
const calls = []
const stub = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  calls.push({
    path: url.pathname,
    key: req.headers['x-api-key'],
    query: Object.fromEntries(url.searchParams.entries()),
  })
  res.writeHead(200, { 'content-type': 'application/json' })
  if (url.pathname === '/v2/tags') {
    // live: requires filter.query; returns results.tags[]
    res.end(JSON.stringify({
      success: true,
      results: {
        tags: [
          { id: 'urn:tag:cuisine:qloo:khmer', name: 'Khmer', type: 'urn:tag:cuisine:qloo' },
          { id: 'urn:tag:genre:place:restaurant:cambodian', name: 'Cambodian', type: 'urn:tag:genre:place' },
        ],
      },
    }))
  } else if (url.pathname === '/search') {
    // live: results[] with entity_id UUID
    res.end(JSON.stringify({
      success: true,
      results: [
        {
          entity_id: 'FE97ADBF-4E86-4377-BBC4-B778E975FD02',
          name: 'Angkor Wat',
          types: ['urn:entity:place'],
          properties: { address: 'Siem Reap', description: 'temple complex' },
        },
        {
          entity_id: '3161CCC4-7E69-4B33-B1D9-57C47E35A74D',
          name: 'Phnom Penh',
          types: ['urn:entity:locality'],
          properties: {},
        },
      ],
    }))
  } else if (url.pathname === '/v2/insights') {
    // live: results.entities[] with entity_id, subtype
    res.end(JSON.stringify({
      success: true,
      results: {
        entities: [
          {
            entity_id: 'A1111111-1111-1111-1111-111111111111',
            name: 'Friends the Restaurant',
            type: 'urn:entity',
            subtype: 'urn:entity:place',
            properties: {
              description: 'training restaurant in Phnom Penh',
              address: '#215 Street 13 Phnom Penh Cambodia',
              business_rating: 4.5,
            },
          },
          {
            entity_id: 'A2222222-2222-2222-2222-222222222222',
            name: 'Malis Restaurant',
            type: 'urn:entity',
            subtype: 'urn:entity:place',
            properties: { address: 'Phnom Penh Cambodia' },
          },
        ],
      },
    }))
  } else {
    res.writeHead(404); res.end(JSON.stringify({ errors: [{ message: 'not found' }] }))
  }
})
await new Promise((r) => stub.listen(0, '127.0.0.1', r))
const port = stub.address().port

const env = { QLOO_API_KEY: 'qloo-test', QLOO_BASE_URL: `http://127.0.0.1:${port}` }

const tagIds = await resolveTagIds(['khmer cuisine', 'cambodian'], 8, env)
assert.ok(tagIds.includes('urn:tag:cuisine:qloo:khmer'), 'tags resolved from results.tags[].id')
assert.ok(calls.some((c) => c.path === '/v2/tags' && c.query['filter.query']), 'tag lookup uses filter.query')

const entityIds = await resolveEntityIds(['Angkor Wat'], ['urn:entity:place'], 4, env)
assert.ok(entityIds.includes('FE97ADBF-4E86-4377-BBC4-B778E975FD02'), 'search returns entity_id UUIDs')
assert.ok(entityIds.every((id) => /^[0-9A-F-]{36}$/i.test(id)), 'ids are bare UUIDs, not urns')

const out = await culturalInsights({ locale: 'km', intent: 'dining', query: 'Phnom Penh family dinner' }, env)

assert.equal(out.success, true)
assert.equal(out.source, 'qloo')
assert.equal(out.culture, 'Khmer')
assert.equal(out.requiresCitation, true, 'cultural picks must be attributed')
assert.equal(out.entities.length, 2)
assert.equal(out.entities[0].name, 'Friends the Restaurant')
assert.equal(out.entities[0].id, 'A1111111-1111-1111-1111-111111111111')
assert.ok(String(out.entities[0].properties.address).includes('Phnom Penh'))
assert.ok(calls.every((c) => c.key === 'qloo-test'), 'X-Api-Key header, never a query param')
assert.ok(calls.some((c) => c.path === '/v2/insights'), 'Insights API is the recommendation source')
const insightCall = calls.find((c) => c.path === '/v2/insights')
assert.ok(insightCall.query['filter.type'] === 'urn:entity:place', 'dining intent -> place')
assert.ok(
  insightCall.query['filter.tags'] || insightCall.query['signal.interests.entities'],
  'insights sent at least one taste signal',
)

const modelView = compactCultureForModel(out)
assert.equal(modelView.culture, 'Khmer')
assert.equal(modelView.topPicks[0].name, 'Friends the Restaurant')
assert.match(modelView.instruction, /user's language/)

// missing key fails closed to a clear error, not a fake local list
await assert.rejects(() => culturalInsights({ locale: 'km' }, {}), /qloo_not_configured/)

// profile coverage for every launch locale we advertise culturally
for (const locale of ['km', 'th', 'ja', 'hi', 'id', 'fil', 'ko', 'zh-CN']) {
  assert.ok(CULTURE_PROFILES[locale], `culture profile exists for ${locale}`)
}

stub.close()
console.log('qloo culture tests passed')
