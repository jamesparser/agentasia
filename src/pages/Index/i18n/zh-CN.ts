import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-CN. Needs native review. */
export const zh_CN: I18n = {
  'Hey {productName}': '嘿 {productName}',
  'Your AI team is ready': '您的 AI 团队已准备就绪',
  'Failed to get response from LLM. Please try again later.': '未能获得 LLM 的回复。请稍后重试。',
  'Writing': '写作',
  'Learn': '学习',
  'Life': '生活',
  'Art': '艺术',
  'Coding': '编码',
  'Live': '直播',
  'Studio': '工作室',
  'Install {productName}': '安装{productName}',
  'Install this app on your device for a better experience and offline access.': '在您的设备上安装此应用程序以获得更好的体验和离线访问。',
  'Recent conversations': '最近的对话',
  'View all': '查看全部',
  'Untitled conversation': '无标题对话',
} as const
