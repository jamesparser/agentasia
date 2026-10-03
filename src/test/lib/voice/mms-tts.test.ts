import { describe, it, expect } from 'vitest'
import { encodeText, hasMmsVoice, parseTokens } from '@/lib/voice/mms-tts'

describe('mms-tts', () => {
  const tokens = parseTokens('ក 1\n  2\nb 3\n_ 4\n')

  it('parses symbols including a space', () => {
    expect(tokens.get(' ')).toBe(2)
    expect(tokens.get('ក')).toBe(1)
  })

  it('puts the blank token between every symbol and drops unknown ones', () => {
    expect(encodeText('កzb', tokens)).toEqual([0, 1, 0, 3, 0])
  })

  it('lowercases when the vocabulary is lowercase only', () => {
    expect(encodeText('B', tokens, true)).toEqual([0, 3, 0])
    expect(encodeText('B', tokens, false)).toEqual([])
  })

  it('knows which languages have a model', () => {
    for (const l of ['km', 'lo', 'my', 'th', 'jv', 'fil', 'kk', 'mn', 'ky', 'uz', 'km-KH']) {
      expect(hasMmsVoice(l)).toBe(true)
    }
    expect(hasMmsVoice('en')).toBe(false)
    expect(hasMmsVoice('ms')).toBe(false)
  })
})
