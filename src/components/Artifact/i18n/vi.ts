import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: vi. Needs native review. */
export const vi: I18n = {
  'Expand artifacts panel': 'Mở rộng bảng tạo tác',
  'Minimize artifacts panel': 'Giảm thiểu bảng tạo tác',
  'Previous artifact': 'Hiện vật trước đó',
  'Next artifact': 'Hiện vật tiếp theo',
  'Dependencies': 'phụ thuộc',
  'Validates Requirements': 'Xác thực yêu cầu',
  'No artifact selected': 'Không có hiện vật nào được chọn',
} as const
