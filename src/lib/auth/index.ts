/**
 * Auth entry point: one provider instance, one subscription surface.
 *
 * The provider is resolved once at module load. When no Firebase config is
 * present it stays `unconfiguredAuth`, `isConfigured` is false, and every UI
 * affordance that depends on an account hides itself instead of offering a
 * button that throws.
 */

import { useSyncExternalStore } from 'react'

import {
  isAuthConfigured,
  unconfiguredAuth,
  type AuthProvider,
  type AuthUser,
} from './authProvider'

export { AuthNotConfiguredError, isAuthConfigured } from './authProvider'
export type { AuthProvider, AuthUser } from './authProvider'

let provider: AuthProvider = unconfiguredAuth
let current: AuthUser | null = null
const listeners = new Set<() => void>()

function emit(): void {
  current = provider.currentUser()
  listeners.forEach((l) => l())
}

let unsubscribe: (() => void) | null = null

/** Called once at app start. Safe to call repeatedly. */
export async function initAuth(): Promise<void> {
  if (unsubscribe) return
  if (!isAuthConfigured()) return
  try {
    const { createFirebaseAuth } = await import('./firebaseAuth')
    const created = await createFirebaseAuth()
    if (!created) return
    provider = created
    unsubscribe = provider.subscribe(emit)
    emit()
  } catch (error) {
    // A failed init must not take the app down: without a provider the app
    // behaves exactly as it did before auth existed.
    console.error('[auth] provider init failed', error)
  }
}

export const auth = {
  get isConfigured(): boolean {
    return provider.configured
  },
  get user(): AuthUser | null {
    return current
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  signInWithGoogle: () => provider.signInWithGoogle(),
  signInWithEmail: (email: string, password: string) =>
    provider.signInWithEmail(email, password),
  registerWithEmail: (email: string, password: string) =>
    provider.registerWithEmail(email, password),
  signOut: () => provider.signOut(),
  getIdToken: () => provider.getIdToken(),
}

export function useAuth(): {
  user: AuthUser | null
  isSignedIn: boolean
  /** False until an OAuth client is configured; hide sign-in UI when so. */
  isConfigured: boolean
} {
  const user = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => null,
  )
  return {
    user,
    isSignedIn: user !== null,
    isConfigured: auth.isConfigured,
  }
}
