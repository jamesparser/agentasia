import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: su. Needs native review. */
export const su: I18n = {
  'DEVS Tours': 'DEVS Tours',
  'Explore the platform in 30-second videos': 'Jelajahi platform dina pidéo 30 detik',
  'Product Tour': 'Tur produk',
  'Agent Studio': 'Agén Studio',
  'Task Delegation': 'Delegasi Tugas',
  'Privacy First': 'Privasi Mimiti',
  'Inbox Workflow': 'Inbox Workflow',
  'The full DEVS story in 30 seconds': 'Carita DEVS lengkep dina 30 detik',
  'Build your own AI team': 'Bangun tim AI anjeun sorangan',
  'Delegate, don’t chat': 'Delegasi, ulah ngobrol',
  'Your keys. Your data. Your browser.': 'konci Anjeun. data anjeun. panyungsi anjeun.',
  'Your AI tasks': 'Tugas AI anjeun',
  '← All tours': '← Sadaya tur',
} as const
