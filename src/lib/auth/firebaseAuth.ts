/**
 * Firebase implementation of AuthProvider.
 *
 * Loaded lazily and only when `VITE_FIREBASE_API_KEY` is set, so the firebase
 * SDK never enters the boot graph of a deployment that has no auth - the app
 * currently ships without credentials, and it must not pay for a library it
 * cannot use.
 *
 * Email + password is enabled alongside Google because the brief asks for both,
 * and because an OAuth client that is still unverified shows Google's
 * "this app is not verified" warning - a working email fallback keeps a demo
 * alive when that screen appears.
 */

import type { AuthProvider, AuthUser } from './authProvider'

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId?: string
  storageBucket?: string
  messagingSenderId?: string
}

function readConfig(): FirebaseConfig | null {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  if (!env.VITE_FIREBASE_API_KEY) return null
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? env.VITE_FIREBASE_API_KEY,
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }
}

function toUser(raw: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  providerData?: { providerId?: string }[]
}): AuthUser {
  const provider = raw.providerData?.some((p) => p.providerId === 'password')
    ? 'password'
    : raw.providerData?.some((p) => p.providerId === 'google.com')
      ? 'google'
      : 'anonymous'
  return {
    uid: raw.uid,
    email: raw.email,
    displayName: raw.displayName,
    photoURL: raw.photoURL,
    provider,
  }
}

export async function createFirebaseAuth(): Promise<AuthProvider | null> {
  const config = readConfig()
  if (!config) return null

  const [{ initializeApp }, firebaseAuth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ])

  const app = initializeApp(config)
  // getAuth is a firebase/auth export, not firebase/app. Importing it from
  // 'firebase/app' typechecks as undefined and would throw the first time a
  // deployment actually had credentials, which is the one moment this must work.
  const auth = firebaseAuth.getAuth(app)

  let cached: AuthUser | null = null
  const listeners = new Set<(user: AuthUser | null) => void>()

  let markReady: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    markReady = resolve
  })
  firebaseAuth.onAuthStateChanged(auth, (user) => {
    cached = user ? toUser(user) : null
    markReady()
    listeners.forEach((l) => l(cached))
  })

  async function run(provider: Promise<unknown>): Promise<AuthUser> {
    const cred = (await provider) as { user: Parameters<typeof toUser>[0] }
    return toUser(cred.user)
  }

  return {
    configured: true,
    ready,
    currentUser: () => cached,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    signInWithGoogle: () =>
      run(
        firebaseAuth.signInWithPopup(
          auth,
          new firebaseAuth.GoogleAuthProvider(),
        ),
      ),
    signInWithEmail: (email, password) =>
      run(firebaseAuth.signInWithEmailAndPassword(auth, email, password)),
    registerWithEmail: (email, password) =>
      run(firebaseAuth.createUserWithEmailAndPassword(auth, email, password)),
    signOut: () => firebaseAuth.signOut(auth),
    // Minted on demand and never stored: it is the credential the gateway
    // verifies, and caching it invites being written to localStorage.
    getIdToken: async () => {
      const user = auth.currentUser
      return user ? user.getIdToken() : null
    },
  }
}
