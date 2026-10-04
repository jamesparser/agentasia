/**
 * Server-side usage for the signed-in caller, from GET /v1/usage.
 * The gateway is the source of truth for plan, model and allowance; this is a
 * read-only mirror for the Usage screen.
 */
import { useEffect, useSyncExternalStore } from 'react'

import { auth } from '@/lib/auth'
import { gatewayFetch } from '@/lib/auth/gatewayFetch'
import { gatewayBase, type PlanId } from '@/lib/llm/managed-lane'

export interface GatewayUsage {
  signedIn: boolean
  plan: PlanId
  model: string
  beta: { active: boolean; endsAt: string | null; paidTiersEnabled: boolean }
  day: string
  used: { requests: number; tokens: number; searches?: number; audio?: number }
  limits: { requests: number; tokens: number; searches?: number; audio?: number; maxTokensPerReply: number }
  remaining: { requests: number; tokens: number; searches?: number; audio?: number }
}

let snapshot: GatewayUsage | null = null
const listeners = new Set<() => void>()

export async function refreshGatewayUsage(): Promise<GatewayUsage | null> {
  try {
    const res = await gatewayFetch(`${gatewayBase()}/v1/usage`)
    // An older gateway without the route answers 401/404: keep showing nothing
    // rather than inventing numbers.
    snapshot = res.ok ? ((await res.json()) as GatewayUsage) : null
  } catch {
    snapshot = null
  }
  listeners.forEach((l) => l())
  return snapshot
}

export function useGatewayUsage(): GatewayUsage | null {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
    () => null,
  )
  const uid = useSyncExternalStoreUser()
  useEffect(() => {
    void refreshGatewayUsage()
  }, [uid])
  return value
}

function useSyncExternalStoreUser(): string | null {
  return useSyncExternalStore(
    (cb) => auth.subscribe(cb),
    () => auth.user?.uid ?? null,
    () => null,
  )
}
