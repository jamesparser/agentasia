/**
 * Device-local usage counting for the Usage and Subscription screens.
 *
 * WHY THIS EXISTS, AND WHAT IT IS NOT
 * -----------------------------------
 * The managed gateway exposes only two public routes - `/v1/models` and
 * `/v1/chat/completions`. Every quota route (`/v1/usage`, `/v1/quota`,
 * `/v1/limits`) answers `401 admin_token_required`, because the spend breaker is
 * an operator concern and the browser has no token. So the client genuinely
 * cannot know the server-side budget remaining.
 *
 * Rather than invent a number, this module counts what the client *can* know:
 * how many requests this device sent this month. It is labelled as such in the
 * UI. The authoritative signal stays the gateway's own `402 budget_exhausted_daily`,
 * which `describeGatewayError` already turns into copy.
 *
 * When the gateway grows a public per-caller usage route, `getUsage()` is the one
 * function to change and the screens stay as they are.
 */

import type { PlanId } from '@/lib/llm/managed-lane'

const KEY = 'agentasia:usage:v1'

/**
 * Monthly request allowances shown in the UI.
 *
 * These are display ceilings for the plan cards, not an enforced quota - the
 * gateway enforces. They are deliberately generous on the free tier because the
 * hackathon lane is rate-limited server-side anyway.
 */
export const PLAN_ALLOWANCE: Record<PlanId, number> = {
  // Monthly figures that mirror the gateway's daily caps times 30
  // (server/src/entitlements.mjs). Sized from cost per request, not guessed:
  // see docs/PRICING.md.
  free: 750,
  pro: 5000,
  smallBusiness: 20000,
  enterprise: 35000,
}

export interface UsageRecord {
  /** 'YYYY-MM' the counts belong to. */
  month: string
  requests: number
  /** Set when the gateway answered 402, so the UI can say why it stopped. */
  limitHitAt?: string
}

export interface UsageView {
  month: string
  requests: number
  allowance: number
  remaining: number
  /** 0..1 - clamped, so a hand-edited counter cannot render a 400% bar. */
  fraction: number
  /** True at 80%: the point where suggesting an upgrade is useful, not nagging. */
  shouldSuggestUpgrade: boolean
  limitHit: boolean
}

const currentMonth = (): string => new Date().toISOString().slice(0, 7)

const read = (): UsageRecord | null => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<UsageRecord>
    if (typeof parsed?.requests !== 'number') return null
    return { month: parsed.month ?? currentMonth(), requests: parsed.requests }
  } catch {
    return null
  }
}

const write = (rec: UsageRecord): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch {
    // Private mode or quota: usage counting is cosmetic and must never break chat.
  }
}

/** Called once per gateway request. Silently ignores anything that could throw. */
export function recordRequest(): void {
  try {
    const month = currentMonth()
    const existing = read()
    const base = existing && existing.month === month ? existing.requests : 0
    write({ month, requests: base + 1, limitHitAt: existing?.limitHitAt })
  } catch {
    /* ignore */
  }
}

/** Records that the gateway refused for budget reasons, with its timestamp. */
export function recordLimitHit(): void {
  try {
    const month = currentMonth()
    const existing = read()
    const base = existing && existing.month === month ? existing.requests : 0
    write({ month, requests: base, limitHitAt: new Date().toISOString() })
  } catch {
    /* ignore */
  }
}

export function getUsage(plan: PlanId): UsageView {
  const month = currentMonth()
  const rec = read()
  // A record from a previous month reads as zero, without needing a cleanup job.
  const requests = rec && rec.month === month ? rec.requests : 0
  const allowance = PLAN_ALLOWANCE[plan] ?? PLAN_ALLOWANCE.free
  const fraction = Math.min(1, allowance > 0 ? requests / allowance : 0)
  return {
    month,
    requests,
    allowance,
    remaining: Math.max(0, allowance - requests),
    fraction,
    shouldSuggestUpgrade: fraction >= 0.8,
    limitHit: Boolean(rec?.limitHitAt && rec.month === month),
  }
}

/** Test helper and a future "reset" affordance. */
export function clearUsage(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
