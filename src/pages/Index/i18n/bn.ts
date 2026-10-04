import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: bn. Needs native review. */
export const bn: I18n = {
  'Hey {productName}': 'আরে {productName}',
  'Your AI team is ready': 'আপনার এআই দল প্রস্তুত',
  'Failed to get response from LLM. Please try again later.': 'এলএলএম থেকে প্রতিক্রিয়া পেতে ব্যর্থ। পরে আবার চেষ্টা করুন.',
  'Writing': 'লেখা',
  'Learn': 'শিখুন',
  'Life': 'জীবন',
  'Art': 'শিল্প',
  'Coding': 'কোডিং',
  'Live': 'লাইভ',
  'Studio': 'স্টুডিও',
  'Install {productName}': '{productName} ইনস্টল করুন',
  'Install this app on your device for a better experience and offline access.': 'একটি ভাল অভিজ্ঞতা এবং অফলাইন অ্যাক্সেসের জন্য আপনার ডিভাইসে এই অ্যাপটি ইনস্টল করুন৷',
  'Recent conversations': 'সাম্প্রতিক কথোপকথন',
  'View all': 'সব দেখুন',
  'Untitled conversation': 'শিরোনামহীন কথোপকথন',
} as const
