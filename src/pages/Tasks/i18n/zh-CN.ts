import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-CN. Needs native review. */
export const zh_CN: I18n = {
  'All': '全部',
  'Running': '跑步',
  'Completed': '已完成',
  'Pending': '待定',
  'Failed': '失败',
  'No tasks found': '没有找到任务',
  'No {status} tasks found': '未找到 {status} 任务',
  'Due': '由于',
  'simple': '简单',
  'complex': '复杂的',
  'requirements': '要求',
  'Filter by status': '按状态过滤',
  'In Progress': '进行中',
  'Sub-Tasks': '子任务',
  'Tasks & Sub-Tasks': '任务和子任务',
  'Scope': '适用范围',
  'Status': '状态',
  'Filters': '过滤器',
} as const
