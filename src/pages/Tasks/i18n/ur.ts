import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ur. Needs native review. */
export const ur: I18n = {
  'All': 'تمام',
  'Running': 'چل رہا ہے۔',
  'Completed': 'مکمل',
  'Pending': 'زیر التواء',
  'Failed': 'ناکام',
  'No tasks found': 'کوئی کام نہیں ملا',
  'No {status} tasks found': 'کوئی {status} کام نہیں ملے',
  'Due': 'واجب الادا',
  'simple': 'سادہ',
  'complex': 'پیچیدہ',
  'requirements': 'ضروریات',
  'Filter by status': 'حیثیت کے لحاظ سے فلٹر کریں۔',
  'In Progress': 'جاری ہے۔',
  'Sub-Tasks': 'ذیلی کام',
  'Tasks & Sub-Tasks': 'کام اور ذیلی کام',
  'Scope': 'دائرہ کار',
  'Status': 'حیثیت',
  'Filters': 'فلٹرز',
} as const
