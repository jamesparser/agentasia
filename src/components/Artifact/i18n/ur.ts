import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ur. Needs native review. */
export const ur: I18n = {
  'Expand artifacts panel': 'نمونے کے پینل کو پھیلائیں۔',
  'Minimize artifacts panel': 'نمونے کے پینل کو کم سے کم کریں۔',
  'Previous artifact': 'پچھلا نمونہ',
  'Next artifact': 'اگلا نمونہ',
  'Dependencies': 'انحصار',
  'Validates Requirements': 'تقاضوں کی توثیق کرتا ہے۔',
  'No artifact selected': 'کوئی آرٹفیکٹ منتخب نہیں کیا گیا۔',
} as const
