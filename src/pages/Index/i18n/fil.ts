import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: fil. Needs native review. */
export const fil: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your AI team is ready': 'Ang iyong AI team ay handa na',
  'Failed to get response from LLM. Please try again later.': 'Nabigong makakuha ng tugon mula sa LLM. Pakisubukang muli mamaya.',
  'Writing': 'Pagsusulat',
  'Learn': 'Matuto',
  'Life': 'Buhay',
  'Art': 'Art',
  'Coding': 'Pag-coding',
  'Live': 'Mabuhay',
  'Studio': 'Studio',
  'Install {productName}': 'I-install ang {productName}',
  'Install this app on your device for a better experience and offline access.': 'I-install ang app na ito sa iyong device para sa mas magandang karanasan at offline na access.',
  'Recent conversations': 'Mga kamakailang pag-uusap',
  'View all': 'Tingnan lahat',
  'Untitled conversation': 'Walang pamagat na pag-uusap',
} as const
