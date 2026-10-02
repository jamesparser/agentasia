import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pl. Needs native review. */
export const pl: I18n = {
  'All': 'Wszystko',
  'Running': 'Bieganie',
  'Completed': 'Ukończono',
  'Pending': 'Oczekujące',
  'Failed': 'Nie udało się',
  'No tasks found': 'Nie znaleziono żadnych zadań',
  'No {status} tasks found': 'Nie znaleziono zadań {status}',
  'Due': 'Termin',
  'simple': 'proste',
  'complex': 'złożone',
  'requirements': 'wymagania',
  'Filter by status': 'Filtruj według stanu',
  'In Progress': 'W toku',
  'Sub-Tasks': 'Podzadania',
  'Tasks & Sub-Tasks': 'Zadania i podzadania',
  'Scope': 'Zakres',
  'Status': 'Stan',
  'Filters': 'Filtry',
} as const
