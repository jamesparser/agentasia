/**
 * "Log in" / "Log out" pill, shown in the bottom bar on every app screen.
 * Renders nothing until sign-in is configured for the site.
 */
import { useState } from 'react'
import { SignInDialog } from '@/components/auth/SignInDialog'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { auth, useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function AccountButton({ className }: { className?: string }) {
  const { lang, t } = useI18n()
  const { user, isSignedIn, isConfigured } = useAuth()
  const [showSignIn, setShowSignIn] = useState(false)
  if (!isConfigured) return null
  const text = isSignedIn
    ? lang === 'en'
      ? 'Log out'
      : t('Sign out')
    : lang === 'en'
      ? 'Log in'
      : t('Sign in')
  const hint = isSignedIn && user?.email ? `${text} (${user.email})` : text
  return (
    <>
      <button
        type="button"
        aria-label={hint}
        title={hint}
        onClick={() => {
          if (!isSignedIn) setShowSignIn(true)
          else void auth.signOut()
        }}
        className={cn(
          'inline-flex min-h-11 max-w-[7rem] items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-opacity hover:opacity-90 sm:px-4 sm:text-base',
          isSignedIn
            ? 'border border-default-300 bg-default-100 text-foreground'
            : 'bg-primary text-primary-foreground',
          className,
        )}
      >
        <Icon name="User" size="sm" className="shrink-0" />
        <span className="truncate">{text}</span>
      </button>
      <SignInDialog isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  )
}
