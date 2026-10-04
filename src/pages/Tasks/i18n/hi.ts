import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: hi. Needs native review. */
export const hi: I18n = {
  'All': 'सब',
  'Running': 'चल रहा है',
  'Completed': 'पूरा हुआ',
  'Pending': 'लंबित',
  'Failed': 'असफल',
  'No tasks found': 'कोई कार्य नहीं मिला',
  'No {status} tasks found': 'कोई {status} कार्य नहीं मिला',
  'Due': 'देय',
  'simple': 'सरल',
  'complex': 'जटिल',
  'requirements': 'आवश्यकताएँ',
  'Filter by status': 'स्थिति के अनुसार फ़िल्टर करें',
  'In Progress': 'प्रगति पर है',
  'Sub-Tasks': 'उप-कार्य',
  'Tasks & Sub-Tasks': 'कार्य एवं उप-कार्य',
  'Scope': 'दायरा',
  'Status': 'स्थिति',
  'Filters': 'फिल्टर',
} as const
