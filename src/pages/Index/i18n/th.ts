import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: th. Needs native review. */
export const th: I18n = {
  'Hey {productName}': 'เฮ้ {productName}',
  'Your AI team is ready': 'ทีม AI ของคุณพร้อมแล้ว',
  'Failed to get response from LLM. Please try again later.': 'ไม่สามารถรับการตอบกลับจาก LLM โปรดลองอีกครั้งในภายหลัง',
  'Writing': 'การเขียน',
  'Learn': 'เรียนรู้',
  'Life': 'ชีวิต',
  'Art': 'ศิลปะ',
  'Coding': 'การเข้ารหัส',
  'Live': 'สด',
  'Studio': 'สตูดิโอ',
  'Install {productName}': 'ติดตั้ง {productName}',
  'Install this app on your device for a better experience and offline access.': 'ติดตั้งแอปนี้บนอุปกรณ์ของคุณเพื่อประสบการณ์ที่ดีขึ้นและการเข้าถึงแบบออฟไลน์',
  'Recent conversations': 'การสนทนาล่าสุด',
  'View all': 'ดูทั้งหมด',
  'Untitled conversation': 'บทสนทนาที่ไม่มีชื่อ',
} as const
