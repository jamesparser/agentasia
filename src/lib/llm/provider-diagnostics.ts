import type { LLMProvider } from '@/types'

/** Convert opaque browser/provider failures into an actionable message. */
export function explainProviderError(
  provider: LLMProvider,
  error: unknown,
): Error {
  const original = error instanceof Error ? error.message : String(error)
  const lower = original.toLowerCase()
  const label =
    provider === 'deepseek'
      ? 'DeepSeek'
      : provider === 'venice'
        ? 'Venice AI'
        : provider

  if (lower.includes('privacy mode') || lower.includes('blocked by privacy')) {
    return new Error(
      `${label} is blocked because Privacy Mode only permits local models. Disable Privacy Mode or select Local (Browser).`,
    )
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors')
  ) {
    return new Error(
      `${label} could not be reached from this browser. This is usually a CORS, network, or browser-extension block. Try again without Privacy Mode; if it persists, use the AgentAsia gateway once configured.`,
    )
  }
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized')
  ) {
    return new Error(
      `${label} rejected the API key. Create a provider API key and paste it again without spaces.`,
    )
  }
  if (lower.includes('404') || lower.includes('model')) {
    return new Error(
      `${label} could not find the selected model. Choose another model or enter the current provider model ID.`,
    )
  }
  return new Error(`${label} request failed: ${original}`)
}
