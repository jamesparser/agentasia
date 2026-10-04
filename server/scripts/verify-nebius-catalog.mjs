// Live compliance guard: proves the hackathon-required models actually exist on
// Nebius Token Factory for THIS key, and (with --chat) makes one real inference
// call so the submission has runtime evidence. Run: node scripts/verify-nebius-catalog.mjs [--chat]
import { PROVIDERS } from '../src/model-router.mjs'

const BASE = process.env.TOKENFACTORY_BASE_URL || 'https://api.tokenfactory.nebius.com/v1'
const KEY = process.env.NEBIUS_API_KEY
if (!KEY) { console.error('NEBIUS_API_KEY not set (put it in server/.env, gitignored)'); process.exit(2) }

const cfg = PROVIDERS.nebius
const res = await fetch(`${BASE}/models`, { headers: { authorization: `Bearer ${KEY}` } })
if (!res.ok) { console.error('catalog HTTP', res.status, (await res.text()).slice(0, 200)); process.exit(1) }
const ids = (await res.json()).data.map((m) => m.id)

console.log(`Token Factory reachable. ${ids.length} models available to this key.`)
let bad = 0
for (const want of cfg.models) {
  const ok = ids.includes(want)
  if (!ok) bad++
  console.log(`  ${ok ? 'OK  ' : 'MISS'}  ${want}`)
}
console.log(`  default ${cfg.defaultModel}: ${ids.includes(cfg.defaultModel) ? 'OK' : 'MISS'}`)

if (process.argv.includes('--chat')) {
  const r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg.defaultModel,
      messages: [
        { role: 'system', content: 'Reply in natural Japanese, one short sentence.' },
        { role: 'user', content: 'こんにちは、君は誰？' },
      ],
      max_tokens: 64,
    }),
  })
  const t = await r.text()
  console.log(`\nchat HTTP ${r.status}`)
  try {
    const d = JSON.parse(t)
    if (d.choices) {
      console.log('  request id :', d.id)
      console.log('  model      :', d.model)
      console.log('  reply      :', (d.choices[0].message.content || '').trim().slice(0, 160))
      console.log('  usage      :', JSON.stringify(d.usage))
    } else console.log('  error:', JSON.stringify(d).slice(0, 300))
  } catch { console.log('  raw:', t.slice(0, 300)) }
}
process.exit(bad ? 1 : 0)
