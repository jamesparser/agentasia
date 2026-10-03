import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Icon } from '@/components/Icon'
import { defaultLang, I18nProvider, langs, useI18n, useUrl, type Lang } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Chat or Worker, as a two position slider (the same idea as the
 * ChatGPT / Gemini mode switch).
 *
 *  - Chat   : the live conversation page (/live), where the naga talks.
 *  - Worker : the tasks screen, where agents run jobs in the background.
 *
 * The current mode comes from the address, so the control is always truthful and
 * the back button works. The last choice is also remembered in this browser.
 */
export type AppMode = 'chat' | 'worker'

const STORAGE_KEY = 'agentasia:mode'

export function rememberMode(mode: AppMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Private windows or blocked storage: the switch still works, it just forgets.
  }
}

export function recalledMode(): AppMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'chat' ? 'chat' : 'worker'
  } catch {
    return 'worker'
  }
}

/** Mode implied by a pathname, with or without a leading language segment. */
export function modeFromPath(pathname: string): AppMode {
  const parts = pathname.split('/').filter(Boolean)
  // /live or /<lang>/live
  return parts[0] === 'live' || parts[1] === 'live' ? 'chat' : 'worker'
}

export function ModeSwitch({
  compact = false,
  className,
}: {
  /** Icons only, for the collapsed sidebar. */
  compact?: boolean
  className?: string
}) {
  const { lang, t } = useI18n()
  const url = useUrl(lang)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mode = modeFromPath(pathname)

  const choose = useCallback(
    (next: AppMode) => {
      rememberMode(next)
      if (next === mode) return
      navigate(url(next === 'chat' ? '/live' : '/tasks'))
    },
    [mode, navigate, url],
  )

  const options: { key: AppMode; label: string; icon: 'Voice' | 'PcCheck' }[] = [
    { key: 'chat', label: t('Chat'), icon: 'Voice' },
    { key: 'worker', label: t('Worker'), icon: 'PcCheck' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={t('Mode')}
      className={cn(
        'relative grid rounded-full border border-default-200 bg-default-100 p-0.5 text-sm',
        compact ? 'w-9 grid-cols-1 gap-0.5' : 'grid-cols-2',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.key === mode
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.label}
            onClick={() => choose(o.key)}
            className={cn(
              'flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-base transition-colors lg:min-h-0 lg:px-3 lg:text-sm',
              compact && 'px-0',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-default-500 hover:text-foreground',
            )}
          >
            <Icon name={o.icon} size="sm" />
            {!compact && <span>{o.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Worker screens that show the floating phone switch: the home and the list
 * pages only. A single task or conversation has its own prompt bar at the bottom,
 * and the Chat screen already carries the switch in its header.
 */
export function isWorkerListRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length && (langs as readonly string[]).includes(parts[0])) parts.shift()
  return parts.length === 0 || (parts.length === 1 && ['tasks', 'inbox', 'agents'].includes(parts[0]))
}

/**
 * The same switch for phones, where the sidebar is a hidden drawer: a small pill
 * pinned to the bottom centre, below the desktop breakpoint. The top of those
 * screens is already taken by the menu button and the search box.
 */
export function MobileModeSwitch() {
  const { pathname } = useLocation()
  if (!isWorkerListRoute(pathname)) return null
  const first = pathname.split('/').filter(Boolean)[0]
  const lang = ((langs as readonly string[]).includes(first) ? first : defaultLang) as Lang
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] lg:hidden">
      <I18nProvider lang={lang}>
        <ModeSwitch className="pointer-events-auto shadow-lg" />
      </I18nProvider>
    </div>
  )
}
