import { describe, expect, it } from 'vitest'
import { explainProviderError } from '@/lib/llm/provider-diagnostics'

describe('provider diagnostics', () => {
  it('explains browser network failures', () => {
    expect(
      explainProviderError('openrouter', new Error('Failed to fetch')).message,
    ).toContain('CORS')
  })

  it('explains rejected credentials', () => {
    expect(
      explainProviderError('deepseek', new Error('401 Unauthorized')).message,
    ).toContain('API key')
  })

  it('explains privacy mode blocking', () => {
    expect(
      explainProviderError('venice', new Error('Blocked by Privacy Mode')).message,
    ).toContain('Privacy Mode')
  })
})
