/**
 * Sign-in dialog: Google, or email + password.
 *
 * Renders nothing when auth is not configured. That is deliberate: a button that
 * opens a form which then throws `AuthNotConfiguredError` on submit is worse for
 * a reviewer than no button at all, and today's deployment has no OAuth client
 * (see src/lib/auth/authProvider.ts).
 *
 * Email + password sits alongside Google because an unverified OAuth app shows
 * Google's "this app is not verified" interstitial, and a demo should not die on
 * that screen.
 */

import { useState } from 'react'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from '@heroui/react'

import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { auth } from '@/lib/auth'
import { errorToast } from '@/lib/toast'

interface SignInDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SignInDialog({ isOpen, onClose }: SignInDialogProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | 'register' | null>(null)

  if (!auth.isConfigured) return null

  const guard = async (kind: 'google' | 'email' | 'register', action: () => Promise<unknown>) => {
    setBusy(kind)
    try {
      await action()
      onClose()
    } catch (error) {
      errorToast(
        t('Sign-in failed'),
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="sm">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Icon name="User" size="sm" />
          {t('Sign in to AgentAsia')}
        </ModalHeader>
        <ModalBody className="flex flex-col gap-3 pb-6">
          <p className="text-muted text-sm">
            {t(
              'Your plan, scheduled tasks and agent memory follow your account instead of this browser.',
            )}
          </p>

          <Button
            variant="bordered"
            fullWidth
            isLoading={busy === 'google'}
            onPress={() => guard('google', () => auth.signInWithGoogle())}
            startContent={busy === 'google' ? null : <Icon name="Google" size="sm" />}
          >
            {t('Continue with Google')}
          </Button>

          <div className="text-muted flex items-center gap-3 text-xs">
            <span className="bg-separator h-px flex-1" />
            {t('or')}
            <span className="bg-separator h-px flex-1" />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="signin-email" className="text-sm text-default-700">
              {t('Email')}
            </label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              value={email}
              onValueChange={setEmail}
              placeholder="you@example.com"
            />
            <label htmlFor="signin-password" className="text-sm text-default-700">
              {t('Password')}
            </label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onValueChange={setPassword}
            />
            <div className="flex gap-2">
              <Button
                color="primary"
                className="flex-1"
                isDisabled={!email || !password}
                isLoading={busy === 'email'}
                onPress={() =>
                  guard('email', () => auth.signInWithEmail(email, password))
                }
              >
                {t('Sign in')}
              </Button>
              <Button
                variant="light"
                isDisabled={!email || !password}
                isLoading={busy === 'register'}
                onPress={() =>
                  guard('register', () =>
                    auth.registerWithEmail(email, password),
                  )
                }
              >
                {t('Create account')}
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
