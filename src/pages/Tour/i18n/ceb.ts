import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ceb. Needs native review. */
export const ceb: I18n = {
  'DEVS Tours': 'Mga Paglibot sa DEVS',
  'Explore the platform in 30-second videos': 'Susihon ang plataporma sa 30 segundos nga mga video',
  'Product Tour': 'Paglibot sa Produkto',
  'Agent Studio': 'Ahente Studio',
  'Task Delegation': 'Delegasyon sa Buluhaton',
  'Privacy First': 'Privacy Una',
  'Inbox Workflow': 'Inbox Workflow',
  'The full DEVS story in 30 seconds': 'Ang tibuuk nga istorya sa DEVS sa 30 segundos',
  'Build your own AI team': 'Paghimo sa imong kaugalingon nga AI team',
  'Delegate, don’t chat': 'Delegado, ayaw pag-chat',
  'Your keys. Your data. Your browser.': 'Ang imong mga yawe. Ang imong datos. Ang imong browser.',
  'Your AI tasks': 'Ang imong mga buluhaton sa AI',
  '← All tours': '← Tanang tour',
} as const
