import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: bn. Needs native review. */
export const bn: I18n = {
  'All': 'সব',
  'Running': 'চলমান',
  'Completed': 'সম্পন্ন',
  'Pending': 'মুলতুবি',
  'Failed': 'ব্যর্থ হয়েছে',
  'No tasks found': 'কোনো কাজ পাওয়া যায়নি',
  'No {status} tasks found': 'কোনো {status} টাস্ক পাওয়া যায়নি',
  'Due': 'ডিউ',
  'simple': 'সহজ',
  'complex': 'জটিল',
  'requirements': 'প্রয়োজনীয়তা',
  'Filter by status': 'স্থিতি দ্বারা ফিল্টার করুন',
  'In Progress': 'চলছে',
  'Sub-Tasks': 'সাব-টাস্ক',
  'Tasks & Sub-Tasks': 'টাস্ক এবং সাব-টাস্ক',
  'Scope': 'ব্যাপ্তি',
  'Status': 'স্ট্যাটাস',
  'Filters': 'ফিল্টার',
} as const
