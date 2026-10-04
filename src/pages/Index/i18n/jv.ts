import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: jv. Needs native review. */
export const jv: I18n = {
  'Hey {productName}': 'wuh {productName}',
  'Your AI team is ready': 'Tim AI sampeyan wis siyap',
  'Failed to get response from LLM. Please try again later.': 'Gagal nampa respon saka LLM. Mangga coba maneh mengko.',
  'Writing': 'Nulis',
  'Learn': 'sinau',
  'Life': 'urip',
  'Art': 'Art',
  'Coding': 'Coding',
  'Live': 'Urip',
  'Studio': 'Studio',
  'Install {productName}': 'Instal {productName}',
  'Install this app on your device for a better experience and offline access.': 'Instal app iki ing piranti kanggo pengalaman sing luwih apik lan akses offline.',
  'Recent conversations': 'obrolan anyar',
  'View all': 'Deleng kabeh',
  'Untitled conversation': 'Obrolan tanpa irah-irahan',
} as const
