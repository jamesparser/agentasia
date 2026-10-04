import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ceb. Needs native review. */
export const ceb: I18n = {
  'Expand artifacts panel': 'Pagpalapad sa artifacts panel',
  'Minimize artifacts panel': 'Pagmenos sa panel sa artifact',
  'Previous artifact': 'Naunang artifact',
  'Next artifact': 'Sunod nga artifact',
  'Dependencies': 'Mga pagsalig',
  'Validates Requirements': 'Pag-validate sa mga Kinahanglanon',
  'No artifact selected': 'Walay gipili nga artifact',
} as const
