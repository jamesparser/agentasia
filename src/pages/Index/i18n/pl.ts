import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pl. Needs native review. */
export const pl: I18n = {
  'Hey {productName}': 'Hej, {productName}',
  'Your AI team is ready': 'Twój zespół AI jest gotowy',
  'Failed to get response from LLM. Please try again later.': 'Nie udało się uzyskać odpowiedzi od LLM. Spróbuj ponownie później.',
  'Writing': 'Pisanie',
  'Learn': 'Ucz się',
  'Life': 'Życie',
  'Art': 'Sztuka',
  'Coding': 'Kodowanie',
  'Live': 'Na żywo',
  'Studio': 'Studio',
  'Install {productName}': 'Zainstaluj {productName}',
  'Install this app on your device for a better experience and offline access.': 'Zainstaluj tę aplikację na swoim urządzeniu, aby uzyskać lepsze wrażenia i dostęp offline.',
  'Recent conversations': 'Ostatnie rozmowy',
  'View all': 'Zobacz wszystkie',
  'Untitled conversation': 'Rozmowa bez tytułu',
} as const
