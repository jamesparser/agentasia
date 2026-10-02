import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: vi. Needs native review. */
export const vi: I18n = {
  'Hey {productName}': 'Này {productName}',
  'Your AI team is ready': 'Nhóm AI của bạn đã sẵn sàng',
  'Failed to get response from LLM. Please try again later.': 'Không nhận được phản hồi từ LLM. Vui lòng thử lại sau.',
  'Writing': 'Viết',
  'Learn': 'Tìm hiểu',
  'Life': 'cuộc sống',
  'Art': 'nghệ thuật',
  'Coding': 'Mã hóa',
  'Live': 'Trực tiếp',
  'Studio': 'Studio',
  'Install {productName}': 'Cài đặt {productName}',
  'Install this app on your device for a better experience and offline access.': 'Cài đặt ứng dụng này trên thiết bị của bạn để có trải nghiệm tốt hơn và truy cập ngoại tuyến.',
  'Recent conversations': 'Cuộc trò chuyện gần đây',
  'View all': 'Xem tất cả',
  'Untitled conversation': 'Cuộc trò chuyện không có tiêu đề',
} as const
