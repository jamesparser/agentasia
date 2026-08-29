import type { Lang } from '@/i18n/locales'

/** Languages covered by the broadest shared hosted-model lane. */
export const COMMON_LLM_LANGUAGES = new Set<Lang>([
  // English plus common Asian languages supported by most general models.
  'en',
  'zh-CN',
  'zh-TW',
  'yue',
  'hi',
  'ja',
  'ko',
  'vi',
  'th',
  'id',
  'ms',
  'bn',
  'ur',
])

/** Route less-common Asian languages through the dedicated language lane. */
export function resolveLanguageRoute(language: Lang): {
  preferred: 'freemium' | 'freemium-language'
  reason: 'common-language' | 'extended-language'
} {
  if (COMMON_LLM_LANGUAGES.has(language)) {
    return { preferred: 'freemium', reason: 'common-language' }
  }
  return { preferred: 'freemium-language', reason: 'extended-language' }
}

export function languageSystemInstruction(
  language: Lang,
  languageName: string,
): string {
  return `Reply in ${languageName} (${language}), preserving code, symbols, URLs, and proper nouns. If your language confidence is low, use the Qwen freemium-language route rather than inventing fluency.`
}
