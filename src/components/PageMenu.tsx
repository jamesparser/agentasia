/**
 * Page Menu Component
 *
 * Fixed top-right menu for global page actions
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonGroup, Tooltip } from '@heroui/react'

import { Icon } from '@/components'
import { AccountButton } from '@/components/AccountButton'
import { LocalBackupButton } from '@/features/local-backup'
import { NotificationButton } from '@/features/notifications'
import { SyncButton } from '@/features/sync'
import { useI18n } from '@/i18n'

export interface PageMenuProps {
  /**
   * Optional supplemental action items to be rendered before the default menu items.
   * Typically buttons or other interactive elements.
   */
  supplementalActions?: React.ReactNode
}

export function PageMenu({ supplementalActions }: PageMenuProps = {}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showExtendedActions, setShowExtendedActions] = useState(false)

  // Register Cmd+, / Ctrl+, shortcut for settings
  useSettingsShortcut()

  return (
    <div className="absolute top-1 end-1 z-20 flex max-w-full flex-wrap items-center justify-end gap-0">
      <AccountButton className="me-1" />
      <ButtonGroup variant="light" isIconOnly className="flex-wrap justify-end">
        {supplementalActions}
      </ButtonGroup>
      <ButtonGroup className="flex-wrap justify-end opacity-70 *:hover:opacity-100">
        <NotificationButton />


        {/* Extended Actions */}
        {showExtendedActions && (
          <>
            <Tooltip content={t('Traces')}>
              <Button
                isIconOnly
                variant="light"
                aria-label={t('Traces')}
                onPress={() =>
                  navigate(
                    `${location.pathname}${location.search}#settings/traces`,
                  )
                }
              >
                <Icon name="Activity" size="sm" />
              </Button>
            </Tooltip>
            <SyncButton />
            <LocalBackupButton />
          </>
        )}

        {/* Toggle Extended Actions */}
        <Tooltip
          content={
            showExtendedActions
              ? t('Hide extended actions')
              : t('Show extended actions')
          }
        >
          <Button
            isIconOnly
            variant="light"
            aria-label={
              showExtendedActions
                ? t('Hide extended actions')
                : t('Show extended actions')
            }
            aria-pressed={showExtendedActions}
            onPress={() => setShowExtendedActions(!showExtendedActions)}
          >
            <Icon
              name={showExtendedActions ? 'NavArrowRight' : 'NavArrowLeft'}
              size="sm"
            />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
/**
 * Hook to register global Cmd+, (Mac) or Ctrl+, (Windows/Linux) keyboard shortcut for settings
 */
function useSettingsShortcut(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+, (Mac) or Ctrl+, (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        navigate(`${window.location.pathname}#settings`, { replace: true })
      }
    }

    // Use capture phase to ensure shortcut works even when focus is in form fields
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [navigate])
}
