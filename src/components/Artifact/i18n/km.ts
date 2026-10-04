import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: km. Needs native review. */
export const km: I18n = {
  'Expand artifacts panel': 'ពង្រីកផ្ទាំងវត្ថុបុរាណ',
  'Minimize artifacts panel': 'បង្រួមបន្ទះវត្ថុបុរាណ',
  'Previous artifact': 'វត្ថុបុរាណពីមុន',
  'Next artifact': 'វត្ថុបុរាណបន្ទាប់',
  'Dependencies': 'ភាពអាស្រ័យ',
  'Validates Requirements': 'បញ្ជាក់តម្រូវការ',
  'No artifact selected': 'មិនបានជ្រើសរើសវត្ថុបុរាណទេ។',
} as const
