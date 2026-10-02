import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-TW. Needs native review. */
export const zh_TW: I18n = {
  'DEVS Tours': 'DEVS 旅遊',
  'Explore the platform in 30-second videos': '透過 30 秒的影片探索該平台',
  'Product Tour': '產品展示',
  'Agent Studio': '代理工作室',
  'Task Delegation': '任務委派',
  'Privacy First': '隱私第一',
  'Inbox Workflow': '收件匣工作流程',
  'The full DEVS story in 30 seconds': '30 秒了解完整的 DEVS 故事',
  'Build your own AI team': '打造屬於自己的AI團隊',
  'Delegate, don’t chat': '代表，不要聊天',
  'Your keys. Your data. Your browser.': '你的鑰匙。你的數據。你的瀏覽器。',
  'Your AI tasks': '您的人工智慧任務',
  '← All tours': '← 所有遊覽',
} as const
