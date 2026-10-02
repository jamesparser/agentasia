import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ms. Needs native review. */
export const ms: I18n = {
  'Hey {productName}': 'Hai {productName}',
  'Your AI team is ready': 'Pasukan AI anda sudah bersedia',
  'Failed to get response from LLM. Please try again later.': 'Gagal mendapat respons daripada LLM. Sila cuba lagi kemudian.',
  'Writing': 'Menulis',
  'Learn': 'Belajar',
  'Life': 'kehidupan',
  'Art': 'Seni',
  'Coding': 'Pengekodan',
  'Live': 'Langsung',
  'Studio': 'Studio',
  'Install {productName}': 'Pasang {productName}',
  'Install this app on your device for a better experience and offline access.': 'Pasang apl ini pada peranti anda untuk pengalaman yang lebih baik dan akses luar talian.',
  'Recent conversations': 'Perbualan terbaru',
  'View all': 'Lihat semua',
  'Untitled conversation': 'Perbualan tanpa tajuk',
} as const
