/**
 * Which plan this browser is on, and the upgrade intent.
 *
 * There is no billing backend yet (`integrations.stripe` is
 * 'planned-server-side' in src/config/agentasia.ts), so this cannot be a real
 * entitlement store - it is a local preference that the Usage and Subscription
 * screens read, and that defaults to `free`.
 *
 * Keeping it here means the day Stripe lands there is exactly one place to swap
 * for a server response, and the upgrade button gets one place to call.
 */

import { useSyncExternalStore } from 'react'

import type { PlanId } from '@/lib/llm/managed-lane'

const KEY = 'agentasia:plan'
const PLANS: PlanId[] = ['free', 'pro', 'smallBusiness', 'enterprise']

const listeners = new Set<() => void>()

const readPlan = (): PlanId => {
  try {
    const raw = localStorage.getItem(KEY)
    return PLANS.includes(raw as PlanId) ? (raw as PlanId) : 'free'
  } catch {
    return 'free'
  }
}

let cached: PlanId = typeof localStorage === 'undefined' ? 'free' : readPlan()

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function usePlan(): PlanId {
  return useSyncExternalStore(subscribe, () => cached, () => 'free')
}

/**
 * Records an upgrade intent.
 *
 * Returns false because no payment can be taken: the button must show that
 * plainly rather than pretend to succeed. When Stripe is wired up this becomes
 * a redirect to a checkout session and returns true.
 */
export function requestUpgrade(_plan: PlanId): { ok: false; reason: 'no-billing-backend' } {
  return { ok: false, reason: 'no-billing-backend' }
}

/** Used by tests and by a future restore-from-server path. */
export function setPlan(plan: PlanId): void {
  try {
    localStorage.setItem(KEY, plan)
  } catch {
    /* ignore */
  }
  cached = plan
  listeners.forEach((l) => l())
}

export function planLabel(plan: PlanId): string {
  return plan === 'smallBusiness' ? 'Small Business' : plan.charAt(0).toUpperCase() + plan.slice(1)
}
