import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: my. Needs native review. */
export const my: I18n = {
  'Hey {productName}': 'ဟေး {productName}',
  'Your AI team is ready': 'သင်၏ AI အဖွဲ့သည် အဆင်သင့်ဖြစ်နေပါပြီ။',
  'Failed to get response from LLM. Please try again later.': 'LLM ထံမှ တုံ့ပြန်မှု မရခဲ့ပါ။ နောက်မှ ထပ်စမ်းကြည့်ပါ။',
  'Writing': 'အရေးအသား',
  'Learn': 'လေ့လာပါ။',
  'Life': 'ဘဝ',
  'Art': 'အနုပညာ',
  'Coding': 'Coding ပါ။',
  'Live': 'နေထိုင်ပါ။',
  'Studio': 'စတူဒီယို',
  'Install {productName}': '{productName} ကို ထည့်သွင်းပါ။',
  'Install this app on your device for a better experience and offline access.': 'ပိုမိုကောင်းမွန်သောအတွေ့အကြုံနှင့် အော့ဖ်လိုင်းအသုံးပြုခွင့်အတွက် ဤအက်ပ်ကို သင့်စက်ပစ္စည်းတွင် ထည့်သွင်းပါ။',
  'Recent conversations': 'လတ်တလော စကားဝိုင်းများ',
  'View all': 'အားလုံးကိုကြည့်ရှုပါ။',
  'Untitled conversation': 'ခေါင်းစဉ်မဲ့ စကားဝိုင်း',
} as const
