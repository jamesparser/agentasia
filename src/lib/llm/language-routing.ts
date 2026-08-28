import type { Lang } from '@/i18n/locales'

/** Languages covered by the broadest shared hosted-model lane. */
export const COMMON_LLM_LANGUAGES = new Set<Lang>([
  'en', 'es', 'pt', 'ja', 'zh-CN', 'zh-TW', 'yue', 'de', 'fr', 'ru', 'pl', 'ko',
])

/** Prefer Qwen or a translation bridge for languages outside the common lane. */
export function resolveLanguageRoute(language: Lang): {
  preferred: 'freemium' | 'qwen' | 'translation-bridge'
  reason: 'common-language' | 'extended-language'
} {
  if (COMMON_LLM_LANGUAGES.has(language)) {
    return { preferred: 'freemium', reason: 'common-language' }
  }
  return { preferred: 'qwen', reason: 'extended-language' }
}

export function languageSystemInstruction(language: Lang, languageName: string): string {
  return `Reply in ${languageName}, preserving code, symbols, URLs, and proper nouns. If your language confidence is low, use the language bridge route rather than inventing fluency.`
}
