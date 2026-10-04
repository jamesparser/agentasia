import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: id. Needs native review. */
export const id: I18n = {
  'Hey {productName}': 'Hai {productName}',
  'Your AI team is ready': 'Tim AI Anda sudah siap',
  'Failed to get response from LLM. Please try again later.': 'Gagal mendapat tanggapan dari LLM. Silakan coba lagi nanti.',
  'Writing': 'Menulis',
  'Learn': 'Belajar',
  'Life': 'Kehidupan',
  'Art': 'Seni',
  'Coding': 'Pengkodean',
  'Live': 'Hidup',
  'Studio': 'Studio',
  'Install {productName}': 'Instal {productName}',
  'Install this app on your device for a better experience and offline access.': 'Instal aplikasi ini di perangkat Anda untuk pengalaman yang lebih baik dan akses offline.',
  'Recent conversations': 'Percakapan baru-baru ini',
  'View all': 'Lihat semuanya',
  'Untitled conversation': 'Percakapan tanpa judul',
} as const
