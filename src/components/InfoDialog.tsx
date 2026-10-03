import { useSyncExternalStore } from 'react'
import { Modal, ModalBody, ModalContent } from '@heroui/react'

import { AGENTASIA } from '@/config/agentasia'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'

/**
 * App info as a dismissible pop up. It replaces the full /info page as the
 * target of the About button and footer link, so it is never a navigation:
 * it opens over whatever the user is doing and closes with the X, Escape or a
 * click outside.
 *
 * Open state lives in a tiny module level store so any button can call
 * `openInfoDialog()` without prop drilling, and one <InfoDialog /> mounted in
 * the app shell renders it.
 */
const REPO_URL: string | null = null
const X_URL = 'https://x.com/JasonParserSec'

let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function openInfoDialog() {
  open = true
  emit()
}

export function closeInfoDialog() {
  open = false
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function InfoDialog() {
  const { t } = useI18n()
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false)

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeInfoDialog}
      placement="center"
      size="sm"
    >
      <ModalContent>
        <ModalBody className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          <img
            src="/brand/naga-head-black.png"
            alt=""
            aria-hidden="true"
            className="h-20 w-20 object-contain dark:hidden"
          />
          <img
            src="/brand/naga-head-white.png"
            alt=""
            aria-hidden="true"
            className="hidden h-20 w-20 object-contain dark:block"
          />
          <div>
            <h2 className="text-foreground text-2xl font-semibold">AgentAsia</h2>
            <p className="text-foreground-500 mt-1 text-sm">
              {t(AGENTASIA.slogan)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground hover:text-primary text-sm font-medium transition-colors"
            >
              @JasonParserSec
            </a>
            {REPO_URL ? (
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Icon name="GitHub" size="sm" />
                {t('Source code')}
              </a>
            ) : null}
          </div>
          <p className="text-foreground-400 text-xs">
            {t('Built for the Nebius x NVIDIA Global AI Hackathon 2026.')}
          </p>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
