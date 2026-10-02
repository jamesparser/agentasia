import { describe, expect, it } from 'vitest'

import { splitForSpeech } from '@/lib/voice/useSpeakAloud'

describe('splitForSpeech', () => {
  it('keeps short text as one piece', () => {
    expect(splitForSpeech('Hello there.')).toEqual(['Hello there.'])
  })

  it('splits long text into pieces no longer than the limit', () => {
    const text = Array.from({ length: 30 }, (_, i) => `This is sentence number ${i}.`).join(' ')
    const parts = splitForSpeech(text, 100)
    expect(parts.length).toBeGreaterThan(3)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(100)
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text)
  })

  it('splits CJK sentences and never returns an empty piece', () => {
    const parts = splitForSpeech('今日は晴れです。明日は雨です。'.repeat(20), 40)
    expect(parts.every((p) => p.length > 0 && p.length <= 40)).toBe(true)
  })

  it('breaks a single huge sentence on spaces', () => {
    const parts = splitForSpeech('word '.repeat(200).trim(), 50)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(50)
  })
})
