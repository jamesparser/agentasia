import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: su. Needs native review. */
export const su: I18n = {
  'All': 'Sadayana',
  'Running': 'Lumpat',
  'Completed': 'Réngsé',
  'Pending': 'Ditunggu',
  'Failed': 'Gagal',
  'No tasks found': 'Teu kapanggih tugas',
  'No {status} tasks found': 'Teu kapanggih tugas {status}',
  'Due': 'alatan',
  'simple': 'basajan',
  'complex': 'kompléks',
  'requirements': 'syarat',
  'Filter by status': 'Nyaring dumasar status',
  'In Progress': 'Dina kamajuan',
  'Sub-Tasks': 'Sub-Tugas',
  'Tasks & Sub-Tasks': 'Tugas & Sub-Tugas',
  'Scope': 'Lingkup',
  'Status': 'Status',
  'Filters': 'Saringan',
} as const
