// Plans, allowances and per-user usage, enforced on the gateway.
//
// The browser's idea of a plan (localStorage) is a preference, not an
// entitlement. Everything that costs money is decided here, from the verified
// uid: which plan the caller is on, which model that plan may use, and how much
// of today's allowance is left.
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'

export const PLAN_IDS = ['free', 'pro', 'smallBusiness', 'enterprise']

// Model ids mirror src/config/agentasia.ts and the PRICES table in spend-guard.
export const PLAN_ALLOWANCE = {
  free: { model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B', dailyRequests: 25, dailyTokens: 40_000, maxTokens: 1500 },
  pro: { model: 'nvidia/nemotron-3-super-120b-a12b', dailyRequests: 500, dailyTokens: 600_000, maxTokens: 4000 },
  smallBusiness: { model: 'nvidia/nemotron-3-super-120b-a12b', dailyRequests: 2500, dailyTokens: 3_000_000, maxTokens: 6000 },
  enterprise: { model: 'nvidia/Nemotron-3-Ultra-550b-a55b', dailyRequests: 10_000, dailyTokens: 12_000_000, maxTokens: 8000 },
}

const day = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

export function betaState(env = process.env, now = Date.now()) {
  const endsAt = env.BETA_ENDS_AT || '2026-12-25T00:00:00+07:00'
  const ends = Date.parse(endsAt)
  return {
    active: Number.isFinite(ends) ? now < ends : true,
    endsAt: Number.isFinite(ends) ? new Date(ends).toISOString() : null,
    // Paid tiers stay off until the owner turns them on. While off, every caller
    // resolves to the free plan no matter what the store says.
    paidTiersEnabled: env.PAID_TIERS_ENABLED === 'true',
  }
}

const file = (env, name, fallback) => env[name] || fallback

async function readJson(path, empty) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return empty }
}
async function writeAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2))
  await rename(tmp, path)
}

// One serialized write queue per file: two overlapping requests must not lose an increment.
const queues = new Map()
function serial(path, task) {
  const prev = queues.get(path) || Promise.resolve()
  const next = prev.catch(() => {}).then(task)
  queues.set(path, next)
  return next
}

const plansPath = (env) => file(env, 'PLANS_FILE', new URL('../../data/plans.json', import.meta.url).pathname)
const usagePath = (env) => file(env, 'USAGE_FILE', new URL('../../data/usage.json', import.meta.url).pathname)

/** Plan for a verified uid. Never reads anything the client sent. */
export async function resolvePlan(uid, env = process.env, now = Date.now()) {
  const beta = betaState(env, now)
  const plans = await readJson(plansPath(env), {})
  const rec = plans[uid]
  let plan = 'free'
  if (beta.paidTiersEnabled && rec && PLAN_IDS.includes(rec.plan)) {
    const live = !rec.until || Date.parse(rec.until) > now
    if (live) plan = rec.plan
  }
  return { plan, ...PLAN_ALLOWANCE[plan], beta }
}

/** Operator-only (admin token route). Webhooks call this after verifying a payment. */
export async function setPlan(uid, plan, { until = null, source = 'admin' } = {}, env = process.env) {
  if (!PLAN_IDS.includes(plan)) throw Object.assign(new Error('unknown_plan'), { statusCode: 400 })
  const path = plansPath(env)
  return serial(path, async () => {
    const plans = await readJson(path, {})
    plans[uid] = { plan, until, source, updatedAt: new Date().toISOString() }
    await writeAtomic(path, plans)
    return plans[uid]
  })
}

export async function usageToday(uid, env = process.env, now = Date.now()) {
  const all = await readJson(usagePath(env), {})
  const rec = all[uid]?.[day(now)] || { requests: 0, tokens: 0 }
  return { day: day(now), requests: rec.requests || 0, tokens: rec.tokens || 0 }
}

/** Throws a 429 error when today's allowance is spent. */
export async function assertWithinAllowance(uid, entitlement, env = process.env, now = Date.now()) {
  const used = await usageToday(uid, env, now)
  if (used.requests >= entitlement.dailyRequests || used.tokens >= entitlement.dailyTokens) {
    throw Object.assign(new Error('daily_allowance_reached'), {
      statusCode: 429,
      allowance: { plan: entitlement.plan, used, dailyRequests: entitlement.dailyRequests, dailyTokens: entitlement.dailyTokens },
    })
  }
  return used
}

export function recordUsage(uid, usage = {}, env = process.env, now = Date.now()) {
  const path = usagePath(env)
  const tokens = usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
  return serial(path, async () => {
    const all = await readJson(path, {})
    const d = day(now)
    const slot = (all[uid] ||= {})
    // keep only the last 7 days per user so the file cannot grow without bound
    for (const k of Object.keys(slot).sort().slice(0, -6)) if (k !== d) delete slot[k]
    const rec = (slot[d] ||= { requests: 0, tokens: 0 })
    rec.requests += 1
    rec.tokens += tokens
    await writeAtomic(path, all)
  })
}

export async function usageReport(principal, env = process.env, now = Date.now()) {
  const ent = principal
    ? await resolvePlan(principal.uid, env, now)
    : { plan: 'free', ...PLAN_ALLOWANCE.free, beta: betaState(env, now) }
  const used = principal ? await usageToday(principal.uid, env, now) : { day: day(now), requests: 0, tokens: 0 }
  return {
    signedIn: Boolean(principal),
    plan: ent.plan,
    model: ent.model,
    beta: ent.beta,
    day: used.day,
    used: { requests: used.requests, tokens: used.tokens },
    limits: { requests: ent.dailyRequests, tokens: ent.dailyTokens, maxTokensPerReply: ent.maxTokens },
    remaining: {
      requests: Math.max(0, ent.dailyRequests - used.requests),
      tokens: Math.max(0, ent.dailyTokens - used.tokens),
    },
  }
}
