import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ja. Needs native review. */
export const ja: I18n = {
  'DEVS Tours': 'DEVSツアー',
  'Explore the platform in 30-second videos': '30 秒のビデオでプラットフォームを詳しく見る',
  'Product Tour': '製品ツアー',
  'Agent Studio': 'エージェントスタジオ',
  'Task Delegation': 'タスクの委任',
  'Privacy First': 'プライバシー第一',
  'Inbox Workflow': '受信箱のワークフロー',
  'The full DEVS story in 30 seconds': '30 秒でわかる DEVS ストーリーの全文',
  'Build your own AI team': '独自の AI チームを構築する',
  'Delegate, don’t chat': '参加者、チャットしないでください',
  'Your keys. Your data. Your browser.': 'あなたの鍵。あなたのデータ。あなたのブラウザ。',
  'Your AI tasks': 'AI のタスク',
  '← All tours': '← すべてのツアー',
} as const
