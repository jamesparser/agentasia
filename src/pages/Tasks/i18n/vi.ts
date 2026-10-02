import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: vi. Needs native review. */
export const vi: I18n = {
  'All': 'Tất cả',
  'Running': 'Đang chạy',
  'Completed': 'Đã hoàn thành',
  'Pending': 'Đang chờ xử lý',
  'Failed': 'thất bại',
  'No tasks found': 'Không tìm thấy nhiệm vụ nào',
  'No {status} tasks found': 'Không tìm thấy tác vụ {status} nào',
  'Due': 'Đến hạn',
  'simple': 'đơn giản',
  'complex': 'phức tạp',
  'requirements': 'yêu cầu',
  'Filter by status': 'Lọc theo trạng thái',
  'In Progress': 'Đang tiến hành',
  'Sub-Tasks': 'Nhiệm vụ phụ',
  'Tasks & Sub-Tasks': 'Nhiệm vụ & Nhiệm vụ phụ',
  'Scope': 'Phạm vi',
  'Status': 'Trạng thái',
  'Filters': 'Bộ lọc',
} as const
