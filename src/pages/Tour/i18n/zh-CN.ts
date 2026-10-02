import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-CN. Needs native review. */
export const zh_CN: I18n = {
  'DEVS Tours': 'DEVS 旅游',
  'Explore the platform in 30-second videos': '通过 30 秒的视频探索该平台',
  'Product Tour': '产品展示',
  'Agent Studio': '代理工作室',
  'Task Delegation': '任务委派',
  'Privacy First': '隐私第一',
  'Inbox Workflow': '收件箱工作流程',
  'The full DEVS story in 30 seconds': '30 秒了解完整的 DEVS 故事',
  'Build your own AI team': '打造属于你自己的AI团队',
  'Delegate, don’t chat': '代表，不要聊天',
  'Your keys. Your data. Your browser.': '你的钥匙。你的数据。你的浏览器。',
  'Your AI tasks': '您的人工智能任务',
  '← All tours': '← 所有游览',
} as const
