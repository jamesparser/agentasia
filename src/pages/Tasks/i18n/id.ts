import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: id. Needs native review. */
export const id: I18n = {
  'All': 'Semua',
  'Running': 'Berlari',
  'Completed': 'Selesai',
  'Pending': 'Tertunda',
  'Failed': 'Gagal',
  'No tasks found': 'Tidak ada tugas yang ditemukan',
  'No {status} tasks found': 'Tidak ada tugas {status} yang ditemukan',
  'Due': 'Jatuh tempo',
  'simple': 'sederhana',
  'complex': 'kompleks',
  'requirements': 'persyaratan',
  'Filter by status': 'Saring berdasarkan status',
  'In Progress': 'Sedang Berlangsung',
  'Sub-Tasks': 'Sub-Tugas',
  'Tasks & Sub-Tasks': 'Tugas & Sub Tugas',
  'Scope': 'Ruang lingkup',
  'Status': 'Status',
  'Filters': 'Filter',
} as const
