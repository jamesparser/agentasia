import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: vi. Needs native review. */
export const vi: I18n = {
  'DEVS Tours': 'Chuyến tham quan DEVS',
  'Explore the platform in 30-second videos': 'Khám phá nền tảng trong video 30 giây',
  'Product Tour': 'Tham quan sản phẩm',
  'Agent Studio': 'Studio đại lý',
  'Task Delegation': 'Phân công nhiệm vụ',
  'Privacy First': 'Quyền riêng tư đầu tiên',
  'Inbox Workflow': 'Quy trình làm việc trong hộp thư đến',
  'The full DEVS story in 30 seconds': 'Câu chuyện DEVS đầy đủ trong 30 giây',
  'Build your own AI team': 'Xây dựng nhóm AI của riêng bạn',
  'Delegate, don’t chat': 'Ủy quyền, không trò chuyện',
  'Your keys. Your data. Your browser.': 'Chìa khóa của bạn. Dữ liệu của bạn. Trình duyệt của bạn.',
  'Your AI tasks': 'Nhiệm vụ AI của bạn',
  '← All tours': '← Tất cả các chuyến tham quan',
} as const
