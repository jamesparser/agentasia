import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: bn. Needs native review. */
export const bn: I18n = {
  'Expand artifacts panel': 'আর্টিফ্যাক্ট প্যানেল প্রসারিত করুন',
  'Minimize artifacts panel': 'আর্টিফ্যাক্ট প্যানেল ছোট করুন',
  'Previous artifact': 'পূর্ববর্তী নিদর্শন',
  'Next artifact': 'পরবর্তী নিদর্শন',
  'Dependencies': 'নির্ভরতা',
  'Validates Requirements': 'প্রয়োজনীয়তা যাচাই করে',
  'No artifact selected': 'কোন শিল্পকর্ম নির্বাচন করা হয়নি',
} as const
