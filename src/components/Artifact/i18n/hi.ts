import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: hi. Needs native review. */
export const hi: I18n = {
  'Expand artifacts panel': 'कलाकृतियों पैनल का विस्तार करें',
  'Minimize artifacts panel': 'कलाकृतियों पैनल को छोटा करें',
  'Previous artifact': 'पिछली कलाकृति',
  'Next artifact': 'अगली कलाकृति',
  'Dependencies': 'निर्भरताएँ',
  'Validates Requirements': 'आवश्यकताओं को मान्य करता है',
  'No artifact selected': 'कोई कलाकृति चयनित नहीं',
} as const
