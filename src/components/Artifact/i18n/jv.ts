import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: jv. Needs native review. */
export const jv: I18n = {
  'Expand artifacts panel': 'Nggedhekake panel artefak',
  'Minimize artifacts panel': 'Nyilikake panel artefak',
  'Previous artifact': 'artefak sadurungé',
  'Next artifact': 'Artefak sabanjure',
  'Dependencies': 'Ketergantungan',
  'Validates Requirements': 'Validates Requirements',
  'No artifact selected': 'Ora ana artefak sing dipilih',
} as const
