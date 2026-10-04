import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: fil. Needs native review. */
export const fil: I18n = {
  'DEVS Tours': 'Mga Paglilibot sa DEVS',
  'Explore the platform in 30-second videos': 'I-explore ang platform sa loob ng 30 segundong mga video',
  'Product Tour': 'Paglilibot sa Produkto',
  'Agent Studio': 'Ahente Studio',
  'Task Delegation': 'Delegasyon ng Gawain',
  'Privacy First': 'Privacy Una',
  'Inbox Workflow': 'Daloy ng Trabaho ng Inbox',
  'The full DEVS story in 30 seconds': 'Ang buong kuwento ng DEVS sa loob ng 30 segundo',
  'Build your own AI team': 'Bumuo ng sarili mong AI team',
  'Delegate, don’t chat': 'Delegate, huwag makipag-chat',
  'Your keys. Your data. Your browser.': 'Iyong mga susi. Ang iyong data. Ang iyong browser.',
  'Your AI tasks': 'Ang iyong mga gawain sa AI',
  '← All tours': '← Lahat ng paglilibot',
} as const
