import type { LanguageCode } from './locales'

/** AgentAsia launch locales. UI strings fall back to English until each locale
 * receives reviewed translations; content must never silently claim a locale is
 * complete before its translation pack has been supplied and reviewed. */
export const AGENTASIA_LOCALE_STATUS: Record<LanguageCode, 'reviewed' | 'fallback'> = {
  en: 'reviewed', ar: 'reviewed', de: 'reviewed', es: 'reviewed', fr: 'reviewed', ko: 'reviewed',
  ja: 'fallback', 'zh-CN': 'fallback', 'zh-TW': 'fallback', yue: 'fallback', vi: 'fallback',
  th: 'fallback', id: 'fallback', ms: 'fallback', fil: 'fallback', ceb: 'fallback', my: 'fallback',
  km: 'fallback', lo: 'fallback', jv: 'fallback', su: 'fallback', hi: 'fallback', bn: 'fallback', ur: 'fallback',
  pt: 'fallback', pl: 'fallback',
}

export function isReviewedLocale(locale: LanguageCode): boolean {
  return AGENTASIA_LOCALE_STATUS[locale] === 'reviewed'
}
