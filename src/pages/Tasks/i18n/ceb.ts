import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ceb. Needs native review. */
export const ceb: I18n = {
  'All': 'Tanan',
  'Running': 'Nagdagan',
  'Completed': 'Nakompleto',
  'Pending': 'Naghulat',
  'Failed': 'Napakyas',
  'No tasks found': 'Walay mga buluhaton nga nakit-an',
  'No {status} tasks found': 'Walay {status} nga buluhaton nga nakit-an',
  'Due': 'Tungod',
  'simple': 'yano',
  'complex': 'komplikado',
  'requirements': 'mga kinahanglanon',
  'Filter by status': 'Pagsala pinaagi sa kahimtang',
  'In Progress': 'Sa Pag-uswag',
  'Sub-Tasks': 'Mga Sub-Task',
  'Tasks & Sub-Tasks': 'Mga Buluhaton ug Sub-Buluhaton',
  'Scope': 'Kasangkaran',
  'Status': 'Status',
  'Filters': 'Mga filter',
} as const
