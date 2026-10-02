import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ja. Needs native review. */
export const ja: I18n = {
  'All': 'すべて',
  'Running': 'ランニング',
  'Completed': '完了',
  'Pending': '保留中',
  'Failed': '失敗しました',
  'No tasks found': 'タスクが見つかりません',
  'No {status} tasks found': '{status} タスクが見つかりません',
  'Due': '期限',
  'simple': 'シンプルな',
  'complex': '複雑な',
  'requirements': '要件',
  'Filter by status': 'ステータスでフィルタリングする',
  'In Progress': '進行中',
  'Sub-Tasks': 'サブタスク',
  'Tasks & Sub-Tasks': 'タスクとサブタスク',
  'Scope': '範囲',
  'Status': 'ステータス',
  'Filters': 'フィルター',
} as const
