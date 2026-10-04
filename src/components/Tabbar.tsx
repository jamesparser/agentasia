import { Icon } from './Icon'
import { useI18n } from '@/i18n'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSearchStore } from '@/features/search/searchStore'

/**
 * Phone bottom bar: settings, search, new task, history. Plain buttons with
 * explicit handlers; the old tab strip routed through href values that no
 * longer exist (/history) and a selection callback that never fired for the
 * tab already selected, so settings, new and history did nothing or hit a 404.
 */
export const Tabbar = ({ className = '' }) => {
  const { t, url } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const items: { key: string; label: string; icon: string; onPress: () => void }[] = [
    {
      key: 'settings',
      label: t('Settings'),
      icon: 'Settings',
      onPress: () => navigate(`${location.pathname}#settings`, { replace: true }),
    },
    {
      key: 'search',
      label: t('Search'),
      icon: 'Search',
      onPress: () => useSearchStore.getState().open(),
    },
    {
      key: 'new',
      label: t('New Task'),
      icon: 'PlusCircleSolid',
      onPress: () => navigate(url('/')),
    },
    {
      key: 'history',
      label: t('History'),
      icon: 'ClockRotateRight',
      onPress: () => navigate(url('/tasks')),
    },
  ]

  return (
    <nav
      className={`fixed bottom-[var(--mobile-bar)] z-20 flex w-full justify-around border-t border-default-200 bg-white/80 backdrop-blur-xs dark:border-default-400 dark:bg-default-50/80 ${className}`}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-label={item.label}
          title={item.label}
          onClick={item.onPress}
          className="flex min-h-14 flex-1 items-center justify-center py-3 active:bg-default-100"
        >
          <Icon name={item.icon as any} size={item.key === 'new' ? 'lg' : undefined} />
        </button>
      ))}
    </nav>
  )
}
