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
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  } else {
    // Signed out: the provider layer still adds a placeholder `Bearer` key for the
    // managed credential. The gateway reads any Authorization header as a Firebase
    // ID token and answers `malformed_token`, so a guest's message failed. Anonymous
    // callers must send no Authorization header at all.
    headers.delete('authorization')
  }
  return fetch(input, { ...init, headers })
}
