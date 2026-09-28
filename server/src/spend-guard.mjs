// Spend circuit-breaker. Token Factory has no hard "stop at zero" switch — a
// bank card is auto-charged when the billing threshold is reached or when the
// balance is negative at the start of a month, and project rate limits *raise*
// themselves under load. So the only reliable guard is one we own: refuse the
// request BEFORE it reaches Nebius once we are out of the budget we decided on.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'

// Verified against Token Factory /v1/models + published rates, USD per 1M tokens.
export const PRICES = {
  'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B': { in: 0.06, out: 0.24, cached: 0.01 },
  'nvidia/Nemotron-3_5-Lightning': { in: 0.06, out: 0.24, cached: 0.01 },
  'nvidia/nemotron-3-super-120b-a12b': { in: 0.3, out: 0.9 },
  'nvidia/Nemotron-3-Ultra-550b-a55b': { in: 1.0, out: 3.0 },
}

const STORE = (env = process.env) => env.SPEND_FILE || '/data/spend.json'
const DAY = () => new Date().toISOString().slice(0, 10)

export function costUsd(model, usage = {}) {
  const p = PRICES[model]
  if (!p) return 0 // unknown model: never block on a price we don't know
  const inTok = usage.prompt_tokens || 0
  const outTok = usage.completion_tokens || 0
  const cached = usage.prompt_tokens_details?.cached_tokens || 0
  const fresh = Math.max(0, inTok - cached)
  return (fresh * p.in + cached * (p.cached ?? p.in) + outTok * p.out) / 1e6
}

// Paths resolve from the caller-supplied env (never process.env) plus a
// repo-local fallback: a guard that silently reads a file nobody writes is worse
// than no guard at all.
let resolvedPath = null
export function ledgerPath(env = process.env) { return resolvedPath || STORE(env) }

async function save(state, env = process.env) {
  let path = resolvedPath || STORE(env)
  try {
    await mkdir(dirname(path), { recursive: true })
    const tmp = `${path}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2))
    await rename(tmp, path) // atomic: no torn file if two writes overlap
    resolvedPath = path
  } catch (error) {
    // Container images mount /data; a laptop does not have it. Fall back to a
    // repo-local ledger so development keeps metering instead of either crashing
    // or, worse, silently tracking nothing. The fallback is still a real file, so
    // this is not a fail-open path.
    // overridable so tests can exercise the both-paths-broken case without
    // mutating filesystem permissions
    const alt = env.SPEND_FALLBACK_FILE
      || new URL('../../data/spend.json', import.meta.url).pathname
    if (path === alt) throw error
    await mkdir(dirname(alt), { recursive: true })
    await writeFile(`${alt}.tmp`, JSON.stringify(state, null, 2))
    await rename(`${alt}.tmp`, alt)
    if (!resolvedPath) console.warn(`[spend-guard] ${path} not writable, using ${alt}`)
    resolvedPath = alt
  }
}

async function load(env = process.env) {
  const fallback = env.SPEND_FALLBACK_FILE || new URL('../../data/spend.json', import.meta.url).pathname
  for (const candidate of [resolvedPath, STORE(env), fallback]) {
    if (!candidate) continue
    try { return JSON.parse(await readFile(candidate, 'utf8')) } catch { /* try next */ }
  }
  return { totalUsd: 0, days: {} }
}

function limits(env = process.env) {
  return {
    enabled: env.SPEND_GUARD_ENABLED === 'true',
    daily: Number(env.DAILY_SPEND_CAP_USD) || 0,
    total: Number(env.TOTAL_SPEND_CAP_USD) || 0,
  }
}

export function resetLedgerHealth() {
  ledgerDegraded = false
  resolvedPath = null // also drop the cached path, or one scenario leaks into the next
}

export function guardStatus(env = process.env) {
  const { enabled, daily, total } = limits(env)
  return { enabled, dailyCapUsd: daily, totalCapUsd: total }
}

// If we cannot meter, we must not spend: a ledger that fails to write would
// otherwise reset to zero on every request and silently disable the guard.
let ledgerDegraded = false
export function ledgerHealthy() { return !ledgerDegraded }

/**
 * Call before forwarding to Nebius. Throws statusCode 402 when over budget, so
 * the gateway answers 402 itself and the provider is never contacted. Throws 503
 * when the guard is enabled but its ledger is broken — an unmeasurable spend is
 * an uncapped spend.
 */
export async function assertWithinBudget(env = process.env) {
  const { enabled, daily, total } = limits(env)
  if (!enabled) return { guarded: false }
  if (ledgerDegraded) {
    const e = new Error('spend_ledger_unavailable'); e.statusCode = 503; throw e
  }
  const state = await load(env)
  const today = state.days?.[DAY()] || 0
  if (total > 0 && state.totalUsd >= total) {
    const e = new Error('budget_exhausted_total'); e.statusCode = 402; e.budget = true; throw e
  }
  if (daily > 0 && today >= daily) {
    const e = new Error('budget_exhausted_daily'); e.statusCode = 402; e.budget = true; throw e
  }
  return { guarded: true, todayUsd: today, totalUsd: state.totalUsd || 0 }
}

/** Record what a completed call cost. Best-effort: never breaks the response. */
export async function recordSpend(model, usage, env = process.env) {
  const cost = costUsd(model, usage)
  if (cost <= 0 || !limits(env).enabled) return { recorded: false, costUsd: cost }
  try {
    const state = await load(env)
    state.totalUsd = Number(((state.totalUsd || 0) + cost).toFixed(8))
    state.days = state.days || {}
    state.days[DAY()] = Number(((state.days[DAY()] || 0) + cost).toFixed(8))
    state.lastModel = model
    await save(state, env)
  } catch (error) {
    // Do not kill this response, but remember it: the next request is refused
    // until the ledger is fixed, so an untracked run can't drain the budget.
    ledgerDegraded = true
    console.error('[spend-guard] ledger write failed, guard now blocking:', error?.message || error)
    return { recorded: false, costUsd: cost, degraded: true }
  }
  return { recorded: true, costUsd: cost }
}
