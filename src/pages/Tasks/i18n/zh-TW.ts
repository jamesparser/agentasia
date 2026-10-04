import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-TW. Needs native review. */
export const zh_TW: I18n = {
  'All': '全部',
  'Running': '跑步',
  'Completed': '已完成',
  'Pending': '待定',
  'Failed': '失敗',
  'No tasks found': '沒有找到任務',
  'No {status} tasks found': '未找到 {status} 任务',
  'Due': '由於',
  'simple': '簡單',
  'complex': '複雜的',
  'requirements': '要求',
  'Filter by status': '按狀態過濾',
  'In Progress': '進行中',
  'Sub-Tasks': '子任務',
  'Tasks & Sub-Tasks': '任務和子任務',
  'Scope': '適用範圍',
  'Status': '狀態',
  'Filters': '過濾器',
} as const
