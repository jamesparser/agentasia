import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: th. Needs native review. */
export const th: I18n = {
  'All': 'ทั้งหมด',
  'Running': 'วิ่ง',
  'Completed': 'เสร็จสิ้น',
  'Pending': 'รอดำเนินการ',
  'Failed': 'ล้มเหลว',
  'No tasks found': 'ไม่พบงาน',
  'No {status} tasks found': 'ไม่พบงาน {status}',
  'Due': 'ครบกำหนด',
  'simple': 'เรียบง่าย',
  'complex': 'ซับซ้อน',
  'requirements': 'ข้อกำหนด',
  'Filter by status': 'กรองตามสถานะ',
  'In Progress': 'อยู่ระหว่างดำเนินการ',
  'Sub-Tasks': 'งานย่อย',
  'Tasks & Sub-Tasks': 'งานและงานย่อย',
  'Scope': 'ขอบเขต',
  'Status': 'สถานะ',
  'Filters': 'ตัวกรอง',
} as const
