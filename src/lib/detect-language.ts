import { defaultLang, type LanguageCode, languages } from '@/i18n/locales'

const AVAILABLE_LANGUAGES = Object.keys(languages) as LanguageCode[]

/** Detects the best matching language from browser preferences. */
export function detectPreferredLanguage(): LanguageCode {
  const browserLanguages =
    typeof navigator !== 'undefined' ? navigator.languages : []

  for (const browserLang of browserLanguages) {
    // Preserve regional variants first so Chinese can distinguish zh-CN and zh-TW.
    const normalized = browserLang
      .split('-')
      .map((part, index) =>
        index === 0 ? part.toLowerCase() : part.toUpperCase(),
      )
      .join('-') as LanguageCode
    if (AVAILABLE_LANGUAGES.includes(normalized)) return normalized

    const baseLanguage = browserLang.split('-')[0].toLowerCase() as LanguageCode
    if (AVAILABLE_LANGUAGES.includes(baseLanguage)) return baseLanguage
  }

  return defaultLang
}

export function hasLanguagePrefix(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return false

  const firstSegment = decodeURIComponent(segments[0]) as LanguageCode
  return AVAILABLE_LANGUAGES.some(
    (language) => language.toLowerCase() === firstSegment.toLowerCase(),
  )
}

export function buildLanguageUrl(pathname: string, lang: LanguageCode): string {
  const cleanPath = pathname.replace(
    new RegExp(`^/(${AVAILABLE_LANGUAGES.join('|')})`),
    '',
  )
  if (lang === defaultLang) return cleanPath || '/'
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`
}
