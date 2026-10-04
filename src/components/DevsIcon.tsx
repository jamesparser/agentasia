import { memo } from 'react'
import { Icon, type IconSize } from './Icon'
import clsx from 'clsx'

// Memoized Devs icons to prevent unnecessary re-renders
// These are shared across the application

export const DevsIcon = memo(
  ({
    loading = false,
    linked = true,
    className = '',
    size = '5xl',
  }: {
    loading?: boolean
    linked?: boolean
    className?: string
    size?: IconSize
  }) => (
    <Icon
      size={size}
      name="DevsAnimated"
      animation="appear"
      className={clsx(
        'fill-gray-400 dark:fill-white',
        loading && 'loading',
        linked && 'linked',
        className,
      )}
    />
  ),
)
DevsIcon.displayName = 'DevsIcon'

export const DevsIconSmall = memo(() => (
  <Icon name="Devs" size="sm" color="grey" />
))
DevsIconSmall.displayName = 'DevsIconSmall'

export const DevsIconXL = memo(() => <Icon name="DevsAnimated" size="xl" />)
DevsIconXL.displayName = 'DevsIconXL'
