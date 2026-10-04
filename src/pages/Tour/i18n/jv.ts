import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: jv. Needs native review. */
export const jv: I18n = {
  'DEVS Tours': 'DEVS Tours',
  'Explore the platform in 30-second videos': 'Jelajahi platform ing video 30 detik',
  'Product Tour': 'Tur produk',
  'Agent Studio': 'Agen Studio',
  'Task Delegation': 'Delegasi Tugas',
  'Privacy First': 'Privasi pisanan',
  'Inbox Workflow': 'Alur Kerja Inbox',
  'The full DEVS story in 30 seconds': 'Crita DEVS lengkap ing 30 detik',
  'Build your own AI team': 'Gawe tim AI dhewe',
  'Delegate, don’t chat': 'Delegasi, aja ngobrol',
  'Your keys. Your data. Your browser.': 'Kunci sampeyan. Data sampeyan. browser Panjenengan.',
  'Your AI tasks': 'Tugas AI sampeyan',
  '← All tours': '← Kabeh wisata',
} as const
