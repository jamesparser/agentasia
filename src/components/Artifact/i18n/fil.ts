import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: fil. Needs native review. */
export const fil: I18n = {
  'Expand artifacts panel': 'Palawakin ang panel ng mga artifact',
  'Minimize artifacts panel': 'I-minimize ang panel ng mga artifact',
  'Previous artifact': 'Nakaraang artifact',
  'Next artifact': 'Susunod na artifact',
  'Dependencies': 'Dependencies',
  'Validates Requirements': 'Pinapatunayan ang Mga Kinakailangan',
  'No artifact selected': 'Walang napiling artifact',
} as const
