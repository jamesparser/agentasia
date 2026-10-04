import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: th. Needs native review. */
export const th: I18n = {
  'DEVS Tours': 'เดฟส์ทัวร์',
  'Explore the platform in 30-second videos': 'สำรวจแพลตฟอร์มในวิดีโอความยาว 30 วินาที',
  'Product Tour': 'ทัวร์ชมผลิตภัณฑ์',
  'Agent Studio': 'ตัวแทนสตูดิโอ',
  'Task Delegation': 'การมอบหมายงาน',
  'Privacy First': 'ความเป็นส่วนตัวมาก่อน',
  'Inbox Workflow': 'เวิร์กโฟลว์กล่องจดหมาย',
  'The full DEVS story in 30 seconds': 'เรื่องราว DEVS ฉบับเต็มใน 30 วินาที',
  'Build your own AI team': 'สร้างทีม AI ของคุณเอง',
  'Delegate, don’t chat': 'มอบหมาย ไม่ต้องแชท',
  'Your keys. Your data. Your browser.': 'กุญแจของคุณ ข้อมูลของคุณ เบราว์เซอร์ของคุณ',
  'Your AI tasks': 'งาน AI ของคุณ',
  '← All tours': '← ทัวร์ทั้งหมด',
} as const
