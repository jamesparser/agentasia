import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: fil. Needs native review. */
export const fil: I18n = {
  'All': 'Lahat',
  'Running': 'Tumatakbo',
  'Completed': 'Nakumpleto',
  'Pending': 'Nakabinbin',
  'Failed': 'Nabigo',
  'No tasks found': 'Walang nakitang gawain',
  'No {status} tasks found': 'Walang nakitang {status} na gawain',
  'Due': 'Dahil',
  'simple': 'simple lang',
  'complex': 'kumplikado',
  'requirements': 'kinakailangan',
  'Filter by status': 'I-filter ayon sa katayuan',
  'In Progress': 'Isinasagawa',
  'Sub-Tasks': 'Mga Sub-Tasks',
  'Tasks & Sub-Tasks': 'Mga Gawain at Sub-Tasks',
  'Scope': 'Saklaw',
  'Status': 'Katayuan',
  'Filters': 'Mga filter',
} as const
