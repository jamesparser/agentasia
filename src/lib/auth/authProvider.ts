/**
 * Account seam for AgentAsia.
 *
 * WHY THIS IS A SEAM AND NOT A WORKING LOGIN
 * ------------------------------------------
 * Plans, scheduled tasks and per-user data all need an identity, and the honest
 * blocker is configuration, not code:
 *
 *   - The only Google OAuth setup on this account (project node0-c2bb7) is
 *     branded "RealCryptoCap", with authorized domains
 *     `node0-c2bb7.firebaseapp.com` and `realcryptocap.com`. Pointing AgentAsia
 *     at it would (a) show judges a consent screen naming a different product,
 *     (b) fail with redirect_uri_mismatch because `agentasia.vercel.app` is not
 *     an authorized domain, and (c) changing that branding would break
 *     RealCryptoCap's live sign-in, which depends on it.
 *   - There is no second, AgentAsia-branded project yet.
 *
 * So the client is written against this interface and stays inert until
 * `VITE_FIREBASE_API_KEY` is present. Nothing here pretends to authenticate a
 * user, and no feature is gated on a session that cannot exist yet.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * No bespoke token, no cookie, no password storage, and no "session" minted
 * client-side. A plan flag set in the browser is a preference, not an
 * entitlement: anything that costs money must be checked against a verified
 * token on the gateway (see server/src/README-auth.md for the server half).
 * Gating paid tiers on client state would be a security illusion, which is
 * worse than an obviously-missing feature.
 */

export interface AuthUser {
  /** Stable provider id - the value the gateway keys per-user data on. */
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  /** Which provider issued this session. */
  provider: 'google' | 'password' | 'anonymous'
}

export interface AuthProvider {
  readonly configured: boolean
  currentUser(): AuthUser | null
  subscribe(listener: (user: AuthUser | null) => void): () => void
  signInWithGoogle(): Promise<AuthUser>
  signInWithEmail(email: string, password: string): Promise<AuthUser>
  registerWithEmail(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  /** Firebase ID token, for the gateway to verify. Never persisted. */
  getIdToken(): Promise<string | null>
}

/**
 * The inert provider. Every method fails loudly rather than silently
 * "succeeding" without an identity - a silent no-op is how a login button ends
 * up looking like it worked.
 */
export const unconfiguredAuth: AuthProvider = {
  configured: false,
  currentUser: () => null,
  subscribe: () => () => {},
  signInWithGoogle: async () => {
    throw new AuthNotConfiguredError()
  },
  signInWithEmail: async () => {
    throw new AuthNotConfiguredError()
  },
  registerWithEmail: async () => {
    throw new AuthNotConfiguredError()
  },
  signOut: async () => {},
  getIdToken: async () => null,
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super(
      'Sign-in is not configured for this deployment. Set VITE_FIREBASE_API_KEY ' +
        '(and the rest of the VITE_FIREBASE_* block) with an OAuth client whose ' +
        'branding says AgentAsia and whose authorized domains include this host.',
    )
    this.name = 'AuthNotConfiguredError'
  }
}

/** True only when a real auth backend has been wired in via env. */
export function isAuthConfigured(): boolean {
  return Boolean(
    typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env as Record<string, string | undefined>)
        .VITE_FIREBASE_API_KEY,
  )
}
