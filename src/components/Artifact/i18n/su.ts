import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: su. Needs native review. */
export const su: I18n = {
  'Expand artifacts panel': 'Dilegakeun panel artefak',
  'Minimize artifacts panel': 'Ngaleutikan panel artefak',
  'Previous artifact': 'artefak saméméhna',
  'Next artifact': 'Artéfak salajengna',
  'Dependencies': 'Depéndensi',
  'Validates Requirements': 'Ngavalidasi Syarat',
  'No artifact selected': 'Taya artefak dipilih',
} as const
