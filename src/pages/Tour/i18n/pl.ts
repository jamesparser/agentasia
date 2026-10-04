import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pl. Needs native review. */
export const pl: I18n = {
  'DEVS Tours': 'Wycieczki DEVS',
  'Explore the platform in 30-second videos': 'Poznaj platformę w 30-sekundowych filmach',
  'Product Tour': 'Wycieczka po produkcie',
  'Agent Studio': 'Studio Agenta',
  'Task Delegation': 'Delegowanie zadań',
  'Privacy First': 'Najpierw prywatność',
  'Inbox Workflow': 'Przepływ pracy w skrzynce odbiorczej',
  'The full DEVS story in 30 seconds': 'Pełna historia DEVS w 30 sekund',
  'Build your own AI team': 'Zbuduj swój własny zespół AI',
  'Delegate, don’t chat': 'Deleguj, nie rozmawiaj',
  'Your keys. Your data. Your browser.': 'Twoje klucze. Twoje dane. Twoja przeglądarka.',
  'Your AI tasks': 'Twoje zadania AI',
  '← All tours': '← Wszystkie wycieczki',
} as const
