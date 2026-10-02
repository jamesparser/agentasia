import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ja. Needs native review. */
export const ja: I18n = {
  'Hey {productName}': 'こんにちは、{productName}',
  'Your AI team is ready': 'AI チームの準備が整いました',
  'Failed to get response from LLM. Please try again later.': 'LLM からの応答を取得できませんでした。後でもう一度試してください。',
  'Writing': '執筆',
  'Learn': '学ぶ',
  'Life': '人生',
  'Art': 'アート',
  'Coding': 'コーディング',
  'Live': 'ライブ',
  'Studio': 'スタジオ',
  'Install {productName}': '{productName}をインストールする',
  'Install this app on your device for a better experience and offline access.': 'より良いエクスペリエンスとオフライン アクセスを実現するには、このアプリをデバイスにインストールします。',
  'Recent conversations': '最近の会話',
  'View all': 'すべて見る',
  'Untitled conversation': '無題の会話',
} as const
