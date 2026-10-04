import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: zh-TW. Needs native review. */
export const zh_TW: I18n = {
  'Hey {productName}': '嘿 {productName}',
  'Your AI team is ready': '您的 AI 團隊已準備就緒',
  'Failed to get response from LLM. Please try again later.': '未能獲得 LLM 的回覆。請稍後重試。',
  'Writing': '寫作',
  'Learn': '學習',
  'Life': '生活',
  'Art': '藝術',
  'Coding': '編碼',
  'Live': '直播',
  'Studio': '工作室',
  'Install {productName}': '安裝{productName}',
  'Install this app on your device for a better experience and offline access.': '在您的裝置上安裝此應用程式以獲得更好的體驗和離線存取。',
  'Recent conversations': '最近的對話',
  'View all': '看全部',
  'Untitled conversation': '無標題對話',
} as const
