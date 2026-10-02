/**
 * fetch for the managed gateway: adds the caller's ID token as a Bearer header
 * when one exists, and only for requests aimed at the gateway, so the token is
 * never sent to a third-party host. Anonymous callers pass through unchanged.
 */
import { gatewayBase } from '@/lib/llm/managed-lane'

import { auth } from './index'

export const gatewayFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const base = gatewayBase()
  if (!base || !url.startsWith(base)) return fetch(input, init)
  const token = await auth.getIdToken().catch(() => null)
  if (!token) return fetch(input, init)
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  headers.set('authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
