/**
 * Dev-only AuthProvider. Asks the gateway for a signed principal at
 * POST /v1/dev/session, which exists only when the gateway runs with
 * GATEWAY_DEV_AUTH_SECRET. Used to test quota, plan and usage end to end without
 * an OAuth client. Enabled only by VITE_DEV_AUTH=1, so a production build that
 * never sets it contains an inert module.
 */
import { gatewayBase } from '@/lib/llm/managed-lane'

import type { AuthProvider, AuthUser } from './authProvider'

const KEY = 'agentasia:dev-session'

interface Session {
  token: string
  user: AuthUser
}

function load(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function createDevAuth(): AuthProvider {
  let session = load()
  const listeners = new Set<(u: AuthUser | null) => void>()
  const set = (next: Session | null) => {
    session = next
    try {
      if (next) sessionStorage.setItem(KEY, JSON.stringify(next))
      else sessionStorage.removeItem(KEY)
    } catch {
      /* private mode: the session simply lasts for this page */
    }
    listeners.forEach((l) => l(session?.user ?? null))
  }

  const mint = async (email: string): Promise<AuthUser> => {
    const res = await fetch(`${gatewayBase()}/v1/dev/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      throw new Error(
        'Dev sign-in is not enabled on this gateway (GATEWAY_DEV_AUTH_SECRET is unset).',
      )
    }
    const body = (await res.json()) as { token: string; uid: string; email: string }
    const user: AuthUser = {
      uid: body.uid,
      email: body.email,
      displayName: body.email,
      photoURL: null,
      provider: 'password',
    }
    set({ token: body.token, user })
    return user
  }

  return {
    configured: true,
    ready: Promise.resolve(),
    currentUser: () => session?.user ?? null,
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    signInWithGoogle: () => mint('google-dev@example.test'),
    signInWithEmail: (email) => mint(email),
    registerWithEmail: (email) => mint(email),
    signOut: async () => set(null),
    getIdToken: async () => session?.token ?? null,
  }
}
