import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: lo. Needs native review. */
export const lo: I18n = {
  'All': 'ທັງໝົດ',
  'Running': 'ແລ່ນ',
  'Completed': 'ສຳເລັດແລ້ວ',
  'Pending': 'ລໍຖ້າຢູ່',
  'Failed': 'ລົ້ມເຫລວ',
  'No tasks found': 'ບໍ່ພົບໜ້າວຽກ',
  'No {status} tasks found': 'ບໍ່ພົບໜ້າວຽກ {status}',
  'Due': 'ຮອດກຳນົດ',
  'simple': 'ງ່າຍດາຍ',
  'complex': 'ຊັບຊ້ອນ',
  'requirements': 'ຄວາມຕ້ອງການ',
  'Filter by status': 'ກັ່ນຕອງຕາມສະຖານະ',
  'In Progress': 'ຢູ່ໃນຄວາມຄືບໜ້າ',
  'Sub-Tasks': 'ວຽກງານຍ່ອຍ',
  'Tasks & Sub-Tasks': 'ວຽກງານ & ວຽກງານຍ່ອຍ',
  'Scope': 'ຂອບເຂດ',
  'Status': 'ສະຖານະ',
  'Filters': 'ການກັ່ນຕອງ',
} as const
