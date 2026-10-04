// Spend circuit-breaker. Token Factory has no hard "stop at zero" switch — a
// bank card is auto-charged when the billing threshold is reached or when the
// balance is negative at the start of a month, and project rate limits *raise*
// themselves under load. So the only reliable guard is one we own: refuse the
// request BEFORE it reaches Nebius once we are out of the budget we decided on.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import { sendAlert } from './alerts.mjs'

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

/** Full state for GET /v1/spend - caps, spend to date, and ledger health. */
export async function spendSummary(env = process.env) {
  const { enabled, daily, total } = limits(env)
  const state = await load(env)
  const today = state.days?.[DAY()] || 0
  const spent = Number(state.totalUsd || 0)
  return {
    guarded: enabled,
    ledgerHealthy: !ledgerDegraded,
    ledgerPath: ledgerPath(env),
    day: DAY(),
    todayUsd: Number(today.toFixed(8)),
    totalUsd: Number(spent.toFixed(8)),
    caps: { dailyUsd: daily, totalUsd: total },
    remaining: {
      dailyUsd: daily > 0 ? Number(Math.max(0, daily - today).toFixed(8)) : null,
      totalUsd: total > 0 ? Number(Math.max(0, total - spent).toFixed(8)) : null,
    },
    lastModel: state.lastModel || null,
    // Estimated headroom at the observed average turn cost (measured ~$0.0000020
    // for a Nano 30B voice turn with reasoning off).
    approxRemainingTurns: (() => {
      const avg = Number(state.avgTurnCostUsd) || 0.000002
      const room = total > 0 ? Math.max(0, total - spent)
        : daily > 0 ? Math.max(0, daily - today) : 0
      return avg > 0 ? Math.floor(room / avg) : null
    })(),
  }
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
  // One email per reason per window the moment a cap trips - the operator learns
  // from us, not from a card statement. Never blocks the 402 itself.
  const alert = async (subject, text, key) => {
    try { await sendAlert({ key: key || subject.toLowerCase().replace(/\W+/g, '-'), subject, text }) } catch {}
  }
  if (ledgerDegraded) {
    alert('AgentAsia: spend ledger broken - gateway blocking',
      `The spend ledger at ${ledgerPath(env)} is unwritable, so the gateway cannot meter and is now refusing\n` +
      `traffic (503 spend_ledger_unavailable) instead of spending untracked. Fix the path or set SPEND_FILE.\n\n` +
      `Host: ${env.HOSTNAME || 'unknown'}  Time: ${new Date().toISOString()}`)
    const e = new Error('spend_ledger_unavailable'); e.statusCode = 503; throw e
  }
  const state = await load(env)
  const today = state.days?.[DAY()] || 0
  if (total > 0 && state.totalUsd >= total) {
    alert('AgentAsia: TOTAL spend cap reached - Nebius not being called',
      `Total cap $${total} reached (spent $${Number(state.totalUsd || 0).toFixed(6)}).\n` +
      `The gateway is now answering 402 and is NOT contacting Token Factory, so no card\n` +
      `charge can be triggered. Raise TOTAL_SPEND_CAP_USD or reset ${ledgerPath(env)} to resume.\n\n` +
      `Top model: ${state.lastModel || 'n/a'}  Time: ${new Date().toISOString()}`)
    const e = new Error('budget_exhausted_total'); e.statusCode = 402; e.budget = true; throw e
  }
  if (daily > 0 && today >= daily) {
    alert('AgentAsia: daily spend cap reached - Nebius not being called',
      `Today (UTC ${DAY()}) hit the $${daily} daily cap.\n` +
      `Gateway answering 402; Token Factory is not contacted until the date rolls over.\n\n` +
      `Spent: $${Number(today).toFixed(6)}  Model: ${state.lastModel || 'n/a'}`)
    const e = new Error('budget_exhausted_daily'); e.statusCode = 402; e.budget = true; throw e
  }
  const spent = Number(state.totalUsd || 0)
  const nearDaily = daily > 0 && today >= daily * 0.8
  const nearTotal = total > 0 && spent >= total * 0.8
  if (nearDaily || nearTotal) {
    alert(`AgentAsia: spend at ${Math.max(nearDaily ? today / (daily || 1) : 0, nearTotal ? spent / (total || 1) : 0).toFixed(0) * 100}% of cap`,
      `Daily: $${Number(today).toFixed(6)} of $${daily}\nTotal: $${spent.toFixed(6)} of $${total}\n` +
      `Model: ${state.lastModel || 'n/a'}\nCheck: ${env.SPEND_FILE || '/data/spend.json'} (GET /v1/spend)`)
  }
  return { guarded: true, todayUsd: today, totalUsd: spent }
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
    const n = Number(state.turns || 0)
    state.turns = n + 1
    state.avgTurnCostUsd = Number((((Number(state.avgTurnCostUsd) || 0) * n) + cost) / (n + 1)).toFixed(10)
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
