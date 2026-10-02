import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: lo. Needs native review. */
export const lo: I18n = {
  'DEVS Tours': 'DEVS ທົວ',
  'Explore the platform in 30-second videos': 'ສຳຫຼວດເວທີດັ່ງກ່າວໃນວິດີໂອ 30 ວິນາທີ',
  'Product Tour': 'ການທ່ອງທ່ຽວຜະລິດຕະພັນ',
  'Agent Studio': 'ຕົວແທນ Studio',
  'Task Delegation': 'ຄະນະຜູ້ແທນວຽກງານ',
  'Privacy First': 'ຄວາມເປັນສ່ວນຕົວກ່ອນ',
  'Inbox Workflow': 'Inbox Workflow',
  'The full DEVS story in 30 seconds': 'ເລື່ອງ DevS ເຕັມໃນ 30 ວິນາທີ',
  'Build your own AI team': 'ສ້າງທີມ AI ຂອງທ່ານເອງ',
  'Delegate, don’t chat': 'ຕົວແທນ, ຢ່າສົນທະນາ',
  'Your keys. Your data. Your browser.': 'ກະແຈຂອງເຈົ້າ. ຂໍ້ມູນຂອງທ່ານ. ຕົວທ່ອງເວັບຂອງທ່ານ.',
  'Your AI tasks': 'ວຽກງານ AI ຂອງທ່ານ',
  '← All tours': '← ການທົວທັງໝົດ',
} as const
