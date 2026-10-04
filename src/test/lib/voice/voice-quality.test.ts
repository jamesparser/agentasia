import { describe, it, expect } from 'vitest'
import { voiceQuality } from '@/lib/voice/useSpeakAloud'

const v = (name: string, localService = true) => ({ name, localService })

describe('voiceQuality', () => {
  it('ranks neural and enhanced voices above compact ones', () => {
    expect(voiceQuality(v('Microsoft Premwadee Online (Natural) - Thai (Thailand)', false))).toBeGreaterThan(
      voiceQuality(v('Kanya')),
    )
    expect(voiceQuality(v('Google ไทย', false))).toBeGreaterThan(voiceQuality(v('eSpeak Thai')))
    expect(voiceQuality(v('Milena (Enhanced)'))).toBeGreaterThan(voiceQuality(v('Milena (Compact)')))
  })
})

import { voiceGenderBias } from '@/lib/voice/useSpeakAloud'

describe('voiceGenderBias', () => {
  it('prefers known male voice names and avoids known female ones', () => {
    expect(voiceGenderBias('Microsoft Guy Online (Natural) - English (United States)')).toBeGreaterThan(0)
    expect(voiceGenderBias('Microsoft Niwat Online (Natural) - Thai (Thailand)')).toBeGreaterThan(0)
    expect(voiceGenderBias('Microsoft Zira - English (United States)')).toBeLessThan(0)
    expect(voiceGenderBias('Microsoft Sreymom Online (Natural) - Khmer (Cambodia)')).toBeLessThan(0)
    expect(voiceGenderBias('Google русский')).toBe(0)
  })
})
