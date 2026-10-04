import { useCallback, useEffect } from 'react'
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
              'flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-base transition-colors ',
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
 * Screens that carry the Chat / Worker switch on phones: the home, the lists,
 * a single task or agent, and the Chat screen. Everything else (marketing and
 * settings pages) is left alone.
 */
export function showsModeBar(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length && (langs as readonly string[]).includes(parts[0])) parts.shift()
  if (parts[0] === 'spaces') parts.splice(0, 2)
  return parts.length === 0 || ['tasks', 'inbox', 'agents', 'live'].includes(parts[0])
}

/**
 * The switch for phones, where the sidebar is a hidden drawer: one bar pinned to
 * the bottom centre of every app screen, the same place everywhere. While it is
 * showing it sets --mobile-bar on the page (see globals.css), and the screens
 * shrink by that much, so it can never cover a button or the prompt box.
 */
export function MobileModeSwitch() {
  const { pathname } = useLocation()
  const visible = showsModeBar(pathname)
  useEffect(() => {
    const root = document.documentElement
    if (visible) root.setAttribute('data-mode-bar', '')
    else root.removeAttribute('data-mode-bar')
    return () => root.removeAttribute('data-mode-bar')
  }, [visible])
  if (!visible) return null
  const first = pathname.split('/').filter(Boolean)[0]
  const lang = ((langs as readonly string[]).includes(first) ? first : defaultLang) as Lang
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--mobile-bar)] items-center justify-center border-t border-default-200 bg-background">
      <I18nProvider lang={lang}>
        <ModeSwitch />
      </I18nProvider>
    </div>
  )
}
