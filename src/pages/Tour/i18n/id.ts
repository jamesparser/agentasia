import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: id. Needs native review. */
export const id: I18n = {
  'DEVS Tours': 'Tur DEVS',
  'Explore the platform in 30-second videos': 'Jelajahi platform dalam video berdurasi 30 detik',
  'Product Tour': 'Tur Produk',
  'Agent Studio': 'Agen Studio',
  'Task Delegation': 'Delegasi Tugas',
  'Privacy First': 'Privasi Pertama',
  'Inbox Workflow': 'Alur Kerja Kotak Masuk',
  'The full DEVS story in 30 seconds': 'Kisah lengkap DEVS dalam 30 detik',
  'Build your own AI team': 'Bangun tim AI Anda sendiri',
  'Delegate, don’t chat': 'Delegasikan, jangan ngobrol',
  'Your keys. Your data. Your browser.': 'Kunci Anda. Data Anda. Peramban Anda.',
  'Your AI tasks': 'Tugas AI Anda',
  '← All tours': '← Semua tur',
} as const
