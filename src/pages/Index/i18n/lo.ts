import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: lo. Needs native review. */
export const lo: I18n = {
  'Hey {productName}': 'Hey {productName}',
  'Your AI team is ready': 'ທີມ AI ຂອງທ່ານພ້ອມແລ້ວ',
  'Failed to get response from LLM. Please try again later.': 'ລົ້ມເຫລວໃນການໄດ້ຮັບການຕອບຮັບຈາກ LLM. ກະລຸນາລອງໃໝ່ໃນພາຍຫຼັງ.',
  'Writing': 'ການຂຽນ',
  'Learn': 'ຮຽນຮູ້',
  'Life': 'ຊີວິດ',
  'Art': 'ສິນລະປະ',
  'Coding': 'ການຂຽນລະຫັດ',
  'Live': 'ດໍາລົງຊີວິດ',
  'Studio': 'ສະຕູດິໂອ',
  'Install {productName}': 'ຕິດຕັ້ງ {productName}',
  'Install this app on your device for a better experience and offline access.': 'ຕິດຕັ້ງແອັບນີ້ຢູ່ໃນອຸປະກອນຂອງທ່ານເພື່ອປະສົບການທີ່ດີກວ່າ ແລະການເຂົ້າເຖິງອອບລາຍ.',
  'Recent conversations': 'ການສົນທະນາທີ່ຜ່ານມາ',
  'View all': 'ເບິ່ງທັງໝົດ',
  'Untitled conversation': 'ການສົນທະນາທີ່ບໍ່ມີຫົວຂໍ້',
} as const
