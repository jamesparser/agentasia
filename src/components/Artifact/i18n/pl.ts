import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pl. Needs native review. */
export const pl: I18n = {
  'Expand artifacts panel': 'Rozwiń panel artefaktów',
  'Minimize artifacts panel': 'Minimalizuj panel artefaktów',
  'Previous artifact': 'Poprzedni artefakt',
  'Next artifact': 'Następny artefakt',
  'Dependencies': 'Zależności',
  'Validates Requirements': 'Sprawdza wymagania',
  'No artifact selected': 'Nie wybrano artefaktu',
} as const
