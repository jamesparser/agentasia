import assert from 'node:assert/strict'
import { costUsd, assertWithinBudget, recordSpend, resetLedgerHealth } from '../src/spend-guard.mjs'

// The guard caches which ledger path worked; each scenario must start clean.
resetLedgerHealth()

const tmp = '/tmp/spend-test.json'
const env = { SPEND_GUARD_ENABLED: 'true', DAILY_SPEND_CAP_USD: '0.0001', TOTAL_SPEND_CAP_USD: '0.01', SPEND_FILE: tmp }
try { await (await import('node:fs/promises')).unlink(tmp) } catch {}

// Nano: 1000 in + 500 out = $0.00006 + $0.00012
assert.ok(Math.abs(costUsd('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 1000, completion_tokens: 500 }) - 0.00018) < 1e-9)
// cached input is cheaper than fresh input
assert.ok(costUsd('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 1000, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 1000 } })
  < costUsd('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 1000, completion_tokens: 0 }))
// unknown model must not fabricate a cost
assert.equal(costUsd('some/other-model', { prompt_tokens: 999, completion_tokens: 999 }), 0)
// guard disabled => never blocks
assert.deepEqual(await assertWithinBudget({ SPEND_GUARD_ENABLED: 'false', SPEND_FILE: tmp }), { guarded: false })

// one big call busts the daily cap, and the next call is refused before Nebius
await recordSpend('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 5000, completion_tokens: 2000 }, env)
await assert.rejects(() => assertWithinBudget(env), (e) => e.statusCode === 402 && e.budget === true && e.message === 'budget_exhausted_daily')

// a disabled guard records nothing and stays open
assert.equal((await recordSpend('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { completion_tokens: 100 }, { SPEND_FILE: tmp })).recorded, false)

console.log('spend-guard tests passed')

// --- resilience: an unwritable primary path must FALL BACK and keep metering ---
const { ledgerHealthy } = await import('../src/spend-guard.mjs')
resetLedgerHealth()
const fallback = '/tmp/spend-fallback.json'
try { await (await import('node:fs/promises')).unlink(fallback) } catch {}
const unwritablePrimary = {
  SPEND_GUARD_ENABLED: 'true', TOTAL_SPEND_CAP_USD: '5', DAILY_SPEND_CAP_USD: '5',
  SPEND_FILE: '/proc/nope/spend.json', SPEND_FALLBACK_FILE: fallback,
}
const fell = await recordSpend('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 1000, completion_tokens: 500 }, unwritablePrimary)
assert.equal(fell.recorded, true, 'falls back instead of dropping the measurement')
assert.equal(ledgerHealthy(), true, 'a working fallback is not a degradation')
assert.ok((await import('node:fs/promises')).readFile(fallback, 'utf8'), 'fallback file holds the ledger')

// --- fail-closed: when BOTH paths are broken, the guard must BLOCK, not pass ---
resetLedgerHealth()
const bothBad = { ...unwritablePrimary, SPEND_FILE: '/proc/nope/spend.json', SPEND_FALLBACK_FILE: '/proc/nope/broken.json' }
const rec = await recordSpend('nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', { prompt_tokens: 10, completion_tokens: 10 }, bothBad)
assert.equal(rec.recorded, false, 'a broken ledger reports it did not record')
await assert.rejects(() => assertWithinBudget(bothBad), (e) => e.statusCode === 503 && e.message === 'spend_ledger_unavailable')
resetLedgerHealth()
assert.equal(ledgerHealthy(), true, 'reset restores health for tests/embedders')
console.log('spend-guard resilience + fail-closed tests passed')

// --- bypass guard: a client that omits `model` must still be metered ---
resetLedgerHealth()
const { routeGatewayChat } = await import('../src/model-router.mjs')
const { resolveGatewayTarget } = await import('../src/model-router.mjs')
const t = resolveGatewayTarget({ messages: [{ role: 'user', content: 'hi' }] }, { NEBIUS_API_KEY: 'k' })
const defaultForLane = (await import('../src/model-router.mjs')).PROVIDERS[t.provider]?.defaultModel
assert.ok(defaultForLane, 'the nebius lane must declare a default model so unmodelled calls are still priced')
assert.ok(/nemotron/i.test(defaultForLane), 'that default must be a Nemotron model')
resetLedgerHealth()
const noModel = '/tmp/spend-nomodel.json'
try { await (await import('node:fs/promises')).unlink(noModel) } catch {}
const envNM = { SPEND_GUARD_ENABLED: 'true', TOTAL_SPEND_CAP_USD: '5', DAILY_SPEND_CAP_USD: '5', SPEND_FILE: noModel }
const recNM = await recordSpend(defaultForLane, { prompt_tokens: 800, completion_tokens: 200 }, envNM)
assert.equal(recNM.recorded, true, 'unmodelled client requests are still billed to the ledger')
assert.ok(recNM.costUsd > 0, 'and at a real cost')
console.log('spend-guard no-model bypass test passed')
