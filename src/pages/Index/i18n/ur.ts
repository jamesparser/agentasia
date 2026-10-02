import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ur. Needs native review. */
export const ur: I18n = {
  'Hey {productName}': 'ارے {productName}',
  'Your AI team is ready': 'آپ کی AI ٹیم تیار ہے۔',
  'Failed to get response from LLM. Please try again later.': 'LLM سے جواب حاصل کرنے میں ناکام۔ براہ کرم بعد میں دوبارہ کوشش کریں۔',
  'Writing': 'تحریر',
  'Learn': 'سیکھیں۔',
  'Life': 'زندگی',
  'Art': 'فن',
  'Coding': 'کوڈنگ',
  'Live': 'جیو',
  'Studio': 'اسٹوڈیو',
  'Install {productName}': '{productName} انسٹال کریں۔',
  'Install this app on your device for a better experience and offline access.': 'بہتر تجربہ اور آف لائن رسائی کے لیے یہ ایپ اپنے آلے پر انسٹال کریں۔',
  'Recent conversations': 'حالیہ گفتگو',
  'View all': 'تمام دیکھیں',
  'Untitled conversation': 'بلا عنوان گفتگو',
} as const
