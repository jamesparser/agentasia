import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: km. Needs native review. */
export const km: I18n = {
  'Hey {productName}': 'ហេ {productName}',
  'Your AI team is ready': 'ក្រុម AI របស់អ្នករួចរាល់ហើយ។',
  'Failed to get response from LLM. Please try again later.': 'បរាជ័យក្នុងការទទួលបានការឆ្លើយតបពី LLM ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។',
  'Writing': 'ការសរសេរ',
  'Learn': 'រៀន',
  'Life': 'ជីវិត',
  'Art': 'សិល្បៈ',
  'Coding': 'ការសរសេរកូដ',
  'Live': 'រស់នៅ',
  'Studio': 'ស្ទូឌីយោ',
  'Install {productName}': 'ដំឡើង {productName}',
  'Install this app on your device for a better experience and offline access.': 'ដំឡើងកម្មវិធីនេះនៅលើឧបករណ៍របស់អ្នកដើម្បីទទួលបានបទពិសោធន៍កាន់តែប្រសើរ និងការចូលប្រើក្រៅបណ្តាញ។',
  'Recent conversations': 'ការសន្ទនាថ្មីៗ',
  'View all': 'មើលទាំងអស់។',
  'Untitled conversation': 'ការសន្ទនាគ្មានចំណងជើង',
} as const
