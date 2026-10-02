import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: id. Needs native review. */
export const id: I18n = {
  'Expand artifacts panel': 'Luaskan panel artefak',
  'Minimize artifacts panel': 'Minimalkan panel artefak',
  'Previous artifact': 'Artefak sebelumnya',
  'Next artifact': 'Artefak berikutnya',
  'Dependencies': 'Ketergantungan',
  'Validates Requirements': 'Memvalidasi Persyaratan',
  'No artifact selected': 'Tidak ada artefak yang dipilih',
} as const
