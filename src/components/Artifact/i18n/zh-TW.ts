import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-TW. Needs native review. */
export const zh_TW: I18n = {
  'Expand artifacts panel': '展開工件面板',
  'Minimize artifacts panel': '最小化偽影面板',
  'Previous artifact': '以前的神器',
  'Next artifact': '下一個神器',
  'Dependencies': '依賴關係',
  'Validates Requirements': '驗證需求',
  'No artifact selected': '未選擇工件',
} as const
