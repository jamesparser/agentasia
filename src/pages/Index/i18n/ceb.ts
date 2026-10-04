import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ceb. Needs native review. */
export const ceb: I18n = {
  'Hey {productName}': 'Uy {productName}',
  'Your AI team is ready': 'Andam na ang imong AI team',
  'Failed to get response from LLM. Please try again later.': 'Napakyas sa pagkuha og tubag gikan sa LLM. Palihug sulayi pag-usab unya.',
  'Writing': 'Pagsulat',
  'Learn': 'Pagkat-on',
  'Life': 'Kinabuhi',
  'Art': 'Art',
  'Coding': 'Pag-coding',
  'Live': 'Mabuhi',
  'Studio': 'Estudyo',
  'Install {productName}': 'I-install ang {productName}',
  'Install this app on your device for a better experience and offline access.': 'I-install kini nga app sa imong device para sa mas maayong kasinatian ug pag-access sa offline.',
  'Recent conversations': 'Bag-o nga mga panag-istoryahanay',
  'View all': 'Tan-awa ang tanan',
  'Untitled conversation': 'Walay ulohang panag-istoryahanay',
} as const
