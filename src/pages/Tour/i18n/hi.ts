import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: hi. Needs native review. */
export const hi: I18n = {
  'DEVS Tours': 'DEVS टूर्स',
  'Explore the platform in 30-second videos': '30-सेकंड के वीडियो में प्लेटफ़ॉर्म का अन्वेषण करें',
  'Product Tour': 'उत्पाद यात्रा',
  'Agent Studio': 'एजेंट स्टूडियो',
  'Task Delegation': 'कार्य प्रतिनिधिमंडल',
  'Privacy First': 'गोपनीयता पहले',
  'Inbox Workflow': 'इनबॉक्स वर्कफ़्लो',
  'The full DEVS story in 30 seconds': 'संपूर्ण DEVS कहानी 30 सेकंड में',
  'Build your own AI team': 'अपनी खुद की एआई टीम बनाएं',
  'Delegate, don’t chat': 'प्रतिनिधि, चैट मत करो',
  'Your keys. Your data. Your browser.': 'आपकी चाबियाँ. आपका डेटा. आपका ब्राउज़र.',
  'Your AI tasks': 'आपके एआई कार्य',
  '← All tours': '← सभी यात्राएँ',
} as const
