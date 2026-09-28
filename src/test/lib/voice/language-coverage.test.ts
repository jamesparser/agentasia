import { describe, expect, it } from 'vitest'
import { resolveVoicePlan, ttsCovers, ASIAN_LANGUAGES } from '@/lib/voice/language-coverage'

describe('naga voice coverage', () => {
  it('speaks the hero language on the free tier without paying for Magpie', () => {
    const p = resolveVoicePlan('ja')
    expect(p.speakable).toBe(true)
    expect(p.tts).toBe('supertonic3')
    expect(p.stt).toBe('nemotron-asr')
  })

  it('never substitutes English for a language it cannot speak', () => {
    // No engine here speaks Khmer, Lao or Burmese.
    for (const lang of ['km', 'lo', 'my']) {
      const p = resolveVoicePlan(lang)
      expect(p.speakable, lang).toBe(false)
      expect(p.textOnly, lang).toBe(true)
      expect(p.reason).toMatch(/showing text rather than substituting English/)
    }
  })

  it('can opt into robotic phonetic output where it exists', () => {
    expect(resolveVoicePlan('km').speakable).toBe(false)
    const robotic = resolveVoicePlan('km', {
      allowRobotic: true,
      engines: ['supertonic3', 'kokoro', 'device', 'espeak'],
    })
    expect(robotic.tts).toBe('espeak')
    expect(robotic.quality).toBe('robotic')
    // and STT still understands it
    expect(resolveVoicePlan('km').stt).toBe('whisper')
  })

  it('gates Magpie behind the paid tier', () => {
    expect(ttsCovers('magpie', 'ja')).toBe(false)
    expect(ttsCovers('magpie', 'ja', true)).toBe(true)
    expect(resolveVoicePlan('ja', { paid: true }).tts).toBe('magpie')
  })

  it('uses device voices only when they are actually present', () => {
    expect(resolveVoicePlan('th').tts).not.toBe('device')
    expect(resolveVoicePlan('th', { deviceVoices: ['th-TH'] }).tts).toBe('device')
  })

  it('does not claim engines that are not integrated yet', () => {
    // Mandarin has no integrated speaker; enabling Piper (a server engine) finds one.
    expect(resolveVoicePlan('zh-CN').speakable).toBe(false)
    const withPiper = resolveVoicePlan('zh-CN', { engines: ['piper', 'supertonic3', 'device'] })
    expect(withPiper.tts).toBe('piper')
    expect(resolveVoicePlan('th', { engines: ['piper'] }).speakable).toBe(false) // Piper has no Thai voice
    expect(resolveVoicePlan('kk', { engines: ['piper'] }).tts).toBe('piper') // Kazakh: yes
  })

  it('normalises Tagalog and keeps the honest language list', () => {
    expect(resolveVoicePlan('fil').speakable).toBe(false)
    expect(ASIAN_LANGUAGES).toContain('km')
  })
})
