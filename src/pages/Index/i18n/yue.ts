import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: yue. Needs native review. */
export const yue: I18n = {
  'Hey {productName}': '喂 {productName}',
  'Your AI team is ready': '你嘅 AI 團隊已經準備好喇',
  'Failed to get response from LLM. Please try again later.': '未能得到 LLM 嘅回應。請遲啲再試一次。',
  'Writing': '寫緊嘢',
  'Learn': '學習',
  'Life': '生命',
  'Art': '藝術',
  'Coding': '編碼',
  'Live': '直播',
  'Studio': '工作室',
  'Install {productName}': '安裝 {productName}',
  'Install this app on your device for a better experience and offline access.': '喺你嘅裝置上面安裝呢個應用程式，以獲得更好嘅體驗同埋離線存取。',
  'Recent conversations': '最近嘅對話',
  'View all': '睇晒',
  'Untitled conversation': '冇標題嘅對話',
} as const
