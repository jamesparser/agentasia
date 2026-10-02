import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: su. Needs native review. */
export const su: I18n = {
  'Hey {productName}': 'Hejo {productName}',
  'Your AI team is ready': 'Tim AI anjeun parantos siap',
  'Failed to get response from LLM. Please try again later.': 'Gagal nampi réspon ti LLM. Mangga cobian deui engké.',
  'Writing': 'Nulis',
  'Learn': 'Diajar',
  'Life': 'Hirup',
  'Art': 'Seni',
  'Coding': 'Coding',
  'Live': 'Hirup',
  'Studio': 'Studio',
  'Install {productName}': 'Pasang {productName}',
  'Install this app on your device for a better experience and offline access.': 'Pasang aplikasi ieu dina alat anjeun pikeun pangalaman anu langkung saé sareng aksés offline.',
  'Recent conversations': 'Paguneman panganyarna',
  'View all': 'Tingali sadayana',
  'Untitled conversation': 'Paguneman tanpa judul',
} as const
