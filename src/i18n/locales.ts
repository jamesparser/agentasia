import * as localesIndex from './locales/index'
import { agentAsiaDraftLocales } from './agentasia-drafts'

/** ISO 639-1 */
enum LanguageCodeEnum {
  en = 'en',
  ar = 'ar',
  de = 'de',
  es = 'es',
  fr = 'fr',
  pt = 'pt',
  pl = 'pl',
  ru = 'ru',
  kk = 'kk',
  mn = 'mn',
  ky = 'ky',
  uz = 'uz',
  ne = 'ne',
  hmn = 'hmn',
  bo = 'bo',
  ko = 'ko',
  ja = 'ja',
  'zh-CN' = 'zh-CN',
  'zh-TW' = 'zh-TW',
  yue = 'yue',
  vi = 'vi',
  th = 'th',
  id = 'id',
  ms = 'ms',
  fil = 'fil',
  ceb = 'ceb',
  my = 'my',
  km = 'km',
  lo = 'lo',
  jv = 'jv',
  su = 'su',
  hi = 'hi',
  bn = 'bn',
  ur = 'ur',
}
export type LanguageCode = `${LanguageCodeEnum}`

export type Lang = LanguageCode

export const languages: Record<LanguageCode, string> = {
  en: 'English',
  ar: 'العربية',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
  pl: 'Polski',
  ru: 'Русский',
  kk: 'Қазақша',
  mn: 'Монгол',
  ky: 'Кыргызча',
  uz: 'Oʻzbekcha',
  ne: 'नेपाली',
  hmn: 'Hmoob',
  bo: 'བོད་སྐད།',
  ko: '한국어',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  yue: '廣東話',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  fil: 'Filipino (Tagalog)',
  ceb: 'Cebuano',
  my: 'မြန်မာ',
  km: 'ខ្មែរ',
  lo: 'ລາວ',
  jv: 'Basa Jawa',
  su: 'Basa Sunda',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ur: 'اردو',
} as const

export const langs = Object.keys(languages).map(
  (lang) => (lang === 'en' ? '' : lang) as Lang,
)

export const en = localesIndex.en

export const defaultLang: LanguageCode = 'en'

export type I18n = Record<(typeof localesIndex.en)[number], string>

export const locales = {
  ...localesIndex,
  ...agentAsiaDraftLocales,
} as Record<keyof typeof languages, I18n | Partial<I18n>>

export const languageDirection: Record<LanguageCode, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
  de: 'ltr',
  es: 'ltr',
  fr: 'ltr',
  pt: 'ltr',
  pl: 'ltr',
  ru: 'ltr',
  kk: 'ltr',
  mn: 'ltr',
  ky: 'ltr',
  uz: 'ltr',
  ne: 'ltr',
  hmn: 'ltr',
  bo: 'ltr',
  ko: 'ltr',
  ja: 'ltr',
  'zh-CN': 'ltr',
  'zh-TW': 'ltr',
  yue: 'ltr',
  vi: 'ltr',
  th: 'ltr',
  id: 'ltr',
  ms: 'ltr',
  fil: 'ltr',
  ceb: 'ltr',
  my: 'ltr',
  km: 'ltr',
  lo: 'ltr',
  jv: 'ltr',
  su: 'ltr',
  hi: 'ltr',
  bn: 'ltr',
  ur: 'rtl',
} as const

export const meta = Object.fromEntries(
  Object.keys(languages).map((lang) => [
    lang,
    (localesIndex as any)[`${lang}_meta`],
  ]),
) as Record<keyof typeof languages, any>
