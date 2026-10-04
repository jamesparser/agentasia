import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ja. Needs native review. */
export const ja: I18n = {
  'Expand artifacts panel': '成果物パネルを展開する',
  'Minimize artifacts panel': 'アーティファクトの最小化パネル',
  'Previous artifact': '前の成果物',
  'Next artifact': '次の成果物',
  'Dependencies': '依存関係',
  'Validates Requirements': '要件を検証する',
  'No artifact selected': 'アーティファクトが選択されていません',
} as const
