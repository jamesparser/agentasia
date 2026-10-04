import type { LanguageCode } from '@/i18n/locales'

export type LocalModelRecommendation = {
  modelId: string
  label: string
  reason: string
  caveat?: string
}

const ASIAN_UI_LANGUAGES = new Set<LanguageCode>([
  'zh-CN',
  'zh-TW',
  'yue',
  'ja',
  'ko',
  'vi',
  'th',
  'id',
  'ms',
  'fil',
  'ceb',
  'my',
  'km',
  'lo',
  'jv',
  'su',
  'hi',
  'bn',
  'ur',
])

/**
 * Browser-local models currently cannot process images or reliably emit native
 * tool calls. This chooser only recommends text chat models that the current
 * Transformers.js/WebGPU runtime can load.
 */
export function recommendLocalModel(
  language: LanguageCode,
  requirements: { vision?: boolean; tools?: boolean } = {},
): LocalModelRecommendation | null {
  if (requirements.vision || requirements.tools) return null

  if (ASIAN_UI_LANGUAGES.has(language)) {
    return {
      modelId: 'onnx-community/Qwen3-0.6B-ONNX',
      label: 'Qwen 3 0.6B (Browser)',
      reason:
        'Best available browser-local recommendation for Asian-language text chat.',
      caveat: 'Text only. Not suitable for reliable agent tool use or vision.',
    }
  }

  return {
    modelId: 'onnx-community/granite-4.0-350m-ONNX-web',
    label: 'Granite 4 350M (Browser)',
    reason: 'Small compatibility fallback for browser-local text chat.',
    caveat: 'Text only. Not suitable for reliable agent tool use or vision.',
  }
}
