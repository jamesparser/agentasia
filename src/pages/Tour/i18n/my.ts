import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: my. Needs native review. */
export const my: I18n = {
  'DEVS Tours': 'DEVS ခရီးစဉ်များ',
  'Explore the platform in 30-second videos': 'စက္ကန့် 30 ဗီဒီယိုများတွင် ပလပ်ဖောင်းကို စူးစမ်းပါ။',
  'Product Tour': 'ထုတ်ကုန်ခရီးစဉ်',
  'Agent Studio': 'အေးဂျင့်စတူဒီယို',
  'Task Delegation': 'Task Delegation',
  'Privacy First': 'ကိုယ်ရေးကိုယ်တာ ပထမ',
  'Inbox Workflow': 'Inbox လုပ်ငန်းအသွားအလာ',
  'The full DEVS story in 30 seconds': 'စက္ကန့် 30 အတွင်း DEVS ဇာတ်လမ်းအပြည့်အစုံ',
  'Build your own AI team': 'သင်၏ကိုယ်ပိုင် AI အဖွဲ့ကိုတည်ဆောက်ပါ။',
  'Delegate, don’t chat': 'ကိုယ်စားလှယ်ပါ၊ စကားမပြောချင်ပါ။',
  'Your keys. Your data. Your browser.': 'မင်းရဲ့သော့တွေ။ သင်၏ဒေတာ။ သင့်ဘရောက်ဆာ။',
  'Your AI tasks': 'သင်၏ AI လုပ်ဆောင်ချက်များ',
  '← All tours': '← ခရီးစဉ်အားလုံး',
} as const
