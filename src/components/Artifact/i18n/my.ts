import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: my. Needs native review. */
export const my: I18n = {
  'Expand artifacts panel': 'ရှေးဟောင်းပစ္စည်းအကန့်ကို ချဲ့ပါ။',
  'Minimize artifacts panel': 'ရှေးဟောင်းပစ္စည်းများ အကန့်ကို လျှော့ပါ။',
  'Previous artifact': 'ယခင်ရှေးဟောင်းပစ္စည်း',
  'Next artifact': 'နောက်တစ်ခု',
  'Dependencies': 'မှီခိုမှု',
  'Validates Requirements': 'လိုအပ်ချက်များကို အတည်ပြုပေးသည်။',
  'No artifact selected': 'မည်သည့်အရာမှ ရွေးချယ်ထားခြင်းမရှိပါ။',
} as const
