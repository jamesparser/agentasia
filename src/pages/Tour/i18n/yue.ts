import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: yue. Needs native review. */
export const yue: I18n = {
  'DEVS Tours': 'DEVS 旅遊',
  'Explore the platform in 30-second videos': '喺30秒嘅影片入面探索呢個平台',
  'Product Tour': '產品導覽',
  'Agent Studio': '代理工作室',
  'Task Delegation': '任務委派',
  'Privacy First': '私隱第一',
  'Inbox Workflow': '收件箱工作流程',
  'The full DEVS story in 30 seconds': '秒內完成完整嘅 DEVS 故事',
  'Build your own AI team': '建立你自己嘅人工智能團隊',
  'Delegate, don’t chat': '委派，唔好傾偈',
  'Your keys. Your data. Your browser.': '你嘅鎖匙。你嘅數據。你個瀏覽器。',
  'Your AI tasks': '你嘅 AI 任務',
  '← All tours': '← 所有嘅旅行團',
} as const
