import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: lo. Needs native review. */
export const lo: I18n = {
  'Expand artifacts panel': 'ຂະຫຍາຍແຜງສິ່ງປະດິດ',
  'Minimize artifacts panel': 'ຫຍໍ້ແຜງສິ່ງປະດິດ',
  'Previous artifact': 'ວັດຖຸບູຮານທີ່ຜ່ານມາ',
  'Next artifact': 'ປອມຕໍ່ໄປ',
  'Dependencies': 'ການເພິ່ງພາອາໄສ',
  'Validates Requirements': 'ຢືນຢັນຄວາມຕ້ອງການ',
  'No artifact selected': 'ບໍ່ໄດ້ເລືອກສິ່ງປະດິດ',
} as const
