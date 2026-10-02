import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ms. Needs native review. */
export const ms: I18n = {
  'Expand artifacts panel': 'Kembangkan panel artifak',
  'Minimize artifacts panel': 'Minimumkan panel artifak',
  'Previous artifact': 'Artifak sebelumnya',
  'Next artifact': 'Artifak seterusnya',
  'Dependencies': 'Kebergantungan',
  'Validates Requirements': 'Mengesahkan Keperluan',
  'No artifact selected': 'Tiada artifak dipilih',
} as const
