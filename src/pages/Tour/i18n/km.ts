import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: km. Needs native review. */
export const km: I18n = {
  'DEVS Tours': 'ដំណើរកំសាន្តរបស់ DEVS',
  'Explore the platform in 30-second videos': 'រុករកវេទិកានេះក្នុងវីដេអូ 30 វិនាទី',
  'Product Tour': 'ដំណើរកំសាន្តផលិតផល',
  'Agent Studio': 'ភ្នាក់ងារស្ទូឌីយោ',
  'Task Delegation': 'ប្រតិភូកិច្ចការ',
  'Privacy First': 'ឯកជនភាពដំបូង',
  'Inbox Workflow': 'លំហូរការងារប្រអប់សំបុត្រ',
  'The full DEVS story in 30 seconds': 'រឿង DEVS ពេញលេញក្នុងរយៈពេល 30 វិនាទី',
  'Build your own AI team': 'បង្កើតក្រុម AI ផ្ទាល់ខ្លួនរបស់អ្នក។',
  'Delegate, don’t chat': 'អ្នកតំណាង កុំជជែក',
  'Your keys. Your data. Your browser.': 'កូនសោរបស់អ្នក។ ទិន្នន័យរបស់អ្នក។ កម្មវិធីរុករករបស់អ្នក។',
  'Your AI tasks': 'កិច្ចការ AI របស់អ្នក។',
  '← All tours': '← ដំណើរកំសាន្តទាំងអស់។',
} as const
