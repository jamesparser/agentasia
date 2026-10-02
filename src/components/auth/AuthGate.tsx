/**
 * Beta account wall. When VITE_REQUIRE_LOGIN=1 and sign-in is configured, the app
 * asks for an account before anything else. The first render always shows the
 * children so the prerendered HTML hydrates cleanly; the wall replaces them right
 * after mount if nobody is signed in.
 */
import { useEffect, useState, type ReactNode } from 'react'

import { useI18n } from '@/i18n'
import { isLoginRequired, useAuth } from '@/lib/auth'

import { SignInDialog } from './SignInDialog'

export function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { isSignedIn, isReady } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!isLoginRequired() || !mounted || isSignedIn) return <>{children}</>
  if (!isReady) return <div className="bg-background fixed inset-0" aria-busy="true" />

  return (
    <div className="bg-background fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-foreground text-2xl font-semibold">
        {t('Create your free AgentAsia account')}
      </h1>
      <p className="text-muted max-w-md text-sm">
        {t('Free during the beta, until December 25, 2026.')}
      </p>
      <SignInDialog isOpen onClose={() => {}} />
    </div>
  )
}
