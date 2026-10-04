import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: my. Needs native review. */
export const my: I18n = {
  'All': 'အားလုံး',
  'Running': 'ပြေးသည်။',
  'Completed': 'ပြီးသွားပြီ',
  'Pending': 'ဆိုင်းငံ့ထားသည်။',
  'Failed': 'မအောင်မြင်',
  'No tasks found': 'အလုပ်များမတွေ့ပါ။',
  'No {status} tasks found': '{status} အလုပ်များကိုမတွေ့ပါ။',
  'Due': 'စူးစူးရဲ',
  'simple': 'ရိုးရှင်းသော',
  'complex': 'ရှုပ်ထွေးသည်။',
  'requirements': 'လိုအပ်ချက်တွေ',
  'Filter by status': 'အခြေအနေအလိုက် စစ်ထုတ်ပါ။',
  'In Progress': 'တိုးတက်နေပါသည်။',
  'Sub-Tasks': 'လုပ်ငန်းတာဝန်ခွဲများ',
  'Tasks & Sub-Tasks': 'Tasks & Sub-Tasks',
  'Scope': 'အတိုင်းအတာ',
  'Status': 'အဆင့်အတန်း',
  'Filters': 'စစ်ထုတ်မှုများ',
} as const
