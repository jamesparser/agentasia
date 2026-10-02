import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: jv. Needs native review. */
export const jv: I18n = {
  'All': 'Kabeh',
  'Running': 'mlaku',
  'Completed': 'Rampung',
  'Pending': 'Ditunggu',
  'Failed': 'Gagal',
  'No tasks found': 'Ora ana tugas sing ditemokake',
  'No {status} tasks found': 'Ora ana tugas {status} sing ditemokake',
  'Due': 'amarga',
  'simple': 'prasaja',
  'complex': 'kompleks',
  'requirements': 'syarat',
  'Filter by status': 'Filter miturut status',
  'In Progress': 'Ing Progress',
  'Sub-Tasks': 'Sub Tugas',
  'Tasks & Sub-Tasks': 'Tugas & Sub-Tugas',
  'Scope': 'Cakupan',
  'Status': 'Status',
  'Filters': 'Filter-filter',
} as const
