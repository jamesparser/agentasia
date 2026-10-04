import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: yue. Needs native review. */
export const yue: I18n = {
  'All': '全部',
  'Running': '跑緊',
  'Completed': '完成咗',
  'Pending': '待處理',
  'Failed': '失敗咗',
  'No tasks found': '搵唔到任何任務',
  'No {status} tasks found': '搵唔到 {status} 任務',
  'Due': '到期',
  'simple': '簡單',
  'complex': '複雜',
  'requirements': '要求',
  'Filter by status': '按狀態過濾',
  'In Progress': '進行中',
  'Sub-Tasks': '子任務',
  'Tasks & Sub-Tasks': '任務同子任務',
  'Scope': '範圍',
  'Status': '狀態',
  'Filters': '過濾器',
} as const
