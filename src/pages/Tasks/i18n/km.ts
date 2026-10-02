import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: km. Needs native review. */
export const km: I18n = {
  'All': 'ទាំងអស់។',
  'Running': 'កំពុងរត់',
  'Completed': 'បានបញ្ចប់',
  'Pending': 'កំពុងរង់ចាំ',
  'Failed': 'បរាជ័យ',
  'No tasks found': 'រកមិនឃើញកិច្ចការទេ។',
  'No {status} tasks found': 'រកមិនឃើញកិច្ចការ {status} ទេ។',
  'Due': 'ដល់កំណត់',
  'simple': 'សាមញ្ញ',
  'complex': 'ស្មុគស្មាញ',
  'requirements': 'តម្រូវការ',
  'Filter by status': 'ត្រងតាមស្ថានភាព',
  'In Progress': 'កំពុងដំណើរការ',
  'Sub-Tasks': 'កិច្ចការរង',
  'Tasks & Sub-Tasks': 'កិច្ចការ & កិច្ចការរង',
  'Scope': 'វិសាលភាព',
  'Status': 'ស្ថានភាព',
  'Filters': 'តម្រង',
} as const
