import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ms. Needs native review. */
export const ms: I18n = {
  'DEVS Tours': 'Lawatan DEVS',
  'Explore the platform in 30-second videos': 'Terokai platform dalam video 30 saat',
  'Product Tour': 'Lawatan Produk',
  'Agent Studio': 'Studio Agen',
  'Task Delegation': 'Perwakilan Tugas',
  'Privacy First': 'Privasi Diutamakan',
  'Inbox Workflow': 'Aliran Kerja Peti Masuk',
  'The full DEVS story in 30 seconds': 'Cerita DEVS penuh dalam 30 saat',
  'Build your own AI team': 'Bina pasukan AI anda sendiri',
  'Delegate, don’t chat': 'Wakilkan, jangan bersembang',
  'Your keys. Your data. Your browser.': 'kunci anda. Data anda. pelayar anda.',
  'Your AI tasks': 'Tugas AI anda',
  '← All tours': '← Semua lawatan',
} as const
