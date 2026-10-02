import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: th. Needs native review. */
export const th: I18n = {
  'Expand artifacts panel': 'ขยายแผงสิ่งประดิษฐ์',
  'Minimize artifacts panel': 'ย่อแผงสิ่งประดิษฐ์ให้เล็กสุด',
  'Previous artifact': 'สิ่งประดิษฐ์ก่อนหน้า',
  'Next artifact': 'สิ่งประดิษฐ์ต่อไป',
  'Dependencies': 'การพึ่งพาอาศัยกัน',
  'Validates Requirements': 'ตรวจสอบข้อกำหนด',
  'No artifact selected': 'ไม่ได้เลือกสิ่งประดิษฐ์',
} as const
