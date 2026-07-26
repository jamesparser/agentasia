import { describe, expect, it } from 'vitest'
import { recommendLocalModel } from '@/lib/llm/local-recommendations'

describe('local model recommendations', () => {
  it('prefers Qwen for supported Asian UI languages', () => {
    expect(recommendLocalModel('ja')?.modelId).toContain('Qwen')
  })

  it('does not recommend a local model for vision or tool use', () => {
    expect(recommendLocalModel('en', { vision: true })).toBeNull()
    expect(recommendLocalModel('en', { tools: true })).toBeNull()
  })
})
