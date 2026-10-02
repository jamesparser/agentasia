import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-CN. Needs native review. */
export const zh_CN: I18n = {
  'Expand artifacts panel': '展开工件面板',
  'Minimize artifacts panel': '最小化伪影面板',
  'Previous artifact': '以前的神器',
  'Next artifact': '下一个神器',
  'Dependencies': '依赖关系',
  'Validates Requirements': '验证需求',
  'No artifact selected': '未选择工件',
} as const
