import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ms. Needs native review. */
export const ms: I18n = {
  'All': 'Semua',
  'Running': 'Berlari',
  'Completed': 'Selesai',
  'Pending': 'Belum selesai',
  'Failed': 'gagal',
  'No tasks found': 'Tiada tugas ditemui',
  'No {status} tasks found': 'Tiada tugasan {status} ditemui',
  'Due': 'kena bayar',
  'simple': 'ringkas',
  'complex': 'kompleks',
  'requirements': 'keperluan',
  'Filter by status': 'Tapis mengikut status',
  'In Progress': 'Sedang Berlangsung',
  'Sub-Tasks': 'Tugasan Kecil',
  'Tasks & Sub-Tasks': 'Tugas & Sub-Tugas',
  'Scope': 'Skop',
  'Status': 'Status',
  'Filters': 'Penapis',
} as const
