import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: yue. Needs native review. */
export const yue: I18n = {
  'Expand artifacts panel': '展開工件面板',
  'Minimize artifacts panel': '將工件面板減到最低',
  'Previous artifact': '之前嘅神器',
  'Next artifact': '下一個神器',
  'Dependencies': '依賴關係',
  'Validates Requirements': '驗證要求',
  'No artifact selected': '冇揀到任何神器',
} as const
