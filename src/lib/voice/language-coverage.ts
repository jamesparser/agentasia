/**
 * Naga voice coverage — VERIFIED engine capability tables, not guesses.
 *
 * Why: every engine here silently degrades to English today
 * (supertonic.getLanguageTag() returns 'en' for unsupported languages), so the
 * assistant reads Japanese aloud in an English voice and *looks like it worked*.
 * That is the worst failure for a product whose slogan is
 * "AI that speaks your language". Callers must honour `speakable === false`.
 *
 * Verified 2026-09-28:
 *  - Supertonic 3 (HF Supertone/supertonic-3): 31 langs incl. ja/ko/vi/hi/id
 *  - Kokoro-82M via kokoro-js: English voices only in this JS port
 *  - Magpie TTS Multilingual (NVIDIA NIM): 12 langs
 *  - Piper (rhasspy VOICES.md): vi, kk, ms, ne present; km/lo/my/th/tl/jv absent
 *  - Whisper large-v3 lang tokens: 100, incl. km/lo/my/th/tl/jw
 *  - Nemotron 3.5 ASR: 40 locales (Latin/Cyrillic/Arabic/Hebrew/CJK/Devanagari/Thai)
 *  - Qwen3-ASR: 52 langs, Apache-2.0 (upgrade candidate)
 */

export type VoiceEngine =
  | 'magpie'      // NVIDIA open model, paid/demo; host on Nebius to also satisfy "runs on Nebius"
  | 'supertonic3' // browser ONNX ~99M, CPU-only, $0
  | 'kokoro'      // browser ONNX (English-only through kokoro-js today)
  | 'device'      // Web Speech API; OS voices; NOT private on Chrome
  | 'piper'       // self-host/edge; maintained fork is GPL-3
  | 'espeak'      // robotic phonetic fallback, widest script coverage
  | 'none'

export type SpeechEngine = 'nemotron-asr' | 'qwen-asr' | 'whisper' | 'parakeet' | 'device' | 'none'

export const ASIAN_LANGUAGES = [
  'ja', 'ko', 'zh-CN', 'zh-TW', 'yue', 'vi', 'th', 'lo', 'km', 'my',
  'id', 'jv', 'su', 'ms', 'fil', 'ceb', 'hi', 'bn', 'ur', 'kk', 'ne', 'ar',
] as const

const TTS: Record<VoiceEngine, ReadonlySet<string>> = {
  // NVIDIA Magpie TTS Multilingual model card: exactly these 12. No Cantonese.
  magpie: new Set(['en', 'es', 'de', 'fr', 'it', 'vi', 'zh-CN', 'hi', 'ja', 'ko', 'ar', 'pt']),
  // Supertonic 3 model card: 31 locales. NOTE: no zh, no th, no km/lo/my.
  supertonic3: new Set(['en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi']),
  kokoro: new Set(['en']),
  device: new Set(['en']),
  // rhasspy/piper-voices HF language tags (server/self-host engine, NOT yet
  // integrated in AgentAsia — requires opts.engines to include it).
  piper: new Set(['ka', 'cs', 'zh-CN', 'is', 'fa', 'fr', 'de', 'es', 'it', 'en', 'sk', 'no', 'ca', 'sl', 'cy', 'ro', 'pl', 'sv', 'ar', 'lv', 'lb', 'fi', 'hu', 'uk', 'vi', 'ru', 'pt', 'da', 'ne', 'sr', 'el', 'sw', 'tr', 'kk', 'nl']),
  espeak: new Set(['km', 'lo', 'my', 'th', 'vi', 'id', 'jv', 'su', 'ms', 'fil', 'ceb', 'hi', 'bn', 'ur', 'kk', 'ne', 'ar', 'zh-CN', 'ja', 'ko', 'ru', 'ta', 'te']),
  none: new Set(),
}

const TTS_ORDER: VoiceEngine[] = ['magpie', 'supertonic3', 'kokoro', 'device', 'piper', 'espeak', 'none']

const STT: Record<SpeechEngine, ReadonlySet<string>> = {
  'nemotron-asr': new Set(['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk', 'cs', 'sv', 'da', 'fi', 'no', 'el', 'hu', 'ro', 'bg', 'sk', 'hr', 'tr', 'ar', 'he', 'hi', 'zh-CN', 'zh-TW', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'kk']),
  'qwen-asr': new Set(['en', 'zh-CN', 'zh-TW', 'yue', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'hi', 'ar', 'ru', 'fr', 'de', 'es', 'pt', 'it', 'kk', 'ur', 'bn']),
  whisper: new Set([...ASIAN_LANGUAGES, 'ta', 'te', 'ml', 'mr', 'gu', 'pa', 'sw', 'am', 'ha', 'yo', 'is', 'ga', 'cy']),
  parakeet: new Set(['en']),
  device: new Set(['en']),
  none: new Set(),
}

const STT_ORDER: SpeechEngine[] = ['nemotron-asr', 'qwen-asr', 'whisper', 'device', 'parakeet', 'none']

export interface VoicePlan {
  language: string
  tts: VoiceEngine
  stt: SpeechEngine
  /** false => render text + visible badge; never speak a different language */
  speakable: boolean
  textOnly: boolean
  quality: 'natural' | 'good' | 'robotic' | 'none'
  reason: string
}

const QUALITY: Partial<Record<VoiceEngine, VoicePlan['quality']>> = {
  magpie: 'natural', supertonic3: 'good', kokoro: 'good', device: 'good', piper: 'good', espeak: 'robotic',
}

function normKey(language: string): string {
  const base = language.split('-')[0]
  if (base === 'zh') return language === 'zh-TW' ? 'zh-TW' : 'zh-CN'
  if (base === 'yue') return 'yue'
  if (base === 'fil' || base === 'tl') return 'fil'
  return base
}

/** Engines that exist in the shipped app today. Piper and espeak need a server
// component, so they are opt-in — claiming them by default would be the same
// kind of overclaim this module exists to prevent. */
export const INTEGRATED_ENGINES: VoiceEngine[] = ['magpie', 'supertonic3', 'kokoro', 'device']

export function resolveVoicePlan(
  language: string,
  opts: {
    deviceVoices?: string[]
    allowRobotic?: boolean
    paid?: boolean
    engines?: VoiceEngine[]
  } = {},
): VoicePlan {
  const key = normKey(language)
  const allowed = opts.engines ?? INTEGRATED_ENGINES
  const deviceSet = new Set((opts.deviceVoices || []).map((v) => v.toLowerCase().replace('_', '-')))

  const tts = TTS_ORDER.find((e) => {
    if (e === 'none' || !allowed.includes(e)) return false
    if (e === 'magpie' && !opts.paid) return false
    if (e === 'espeak' && !opts.allowRobotic) return false
    if (e === 'device') {
      // A device voice like 'th-TH' must satisfy a request for 'th'.
      return (
        deviceSet.has(key) ||
        deviceSet.has(language.toLowerCase()) ||
        [...deviceSet].some((v) => v === key || v.startsWith(`${key}-`))
      )
    }
    return TTS[e].has(key) || TTS[e].has(language)
  }) ?? 'none'

  const stt = STT_ORDER.find((e) => e !== 'none' && (STT[e].has(key) || STT[e].has(language))) ?? 'none'

  const speakable = tts !== 'none'
  return {
    language, tts, stt, speakable,
    textOnly: !speakable,
    quality: QUALITY[tts] ?? 'none',
    reason: speakable
      ? `${tts} covers ${language}`
      : `no engine here speaks ${language}; showing text rather than substituting English`,
  }
}

export function ttsCovers(engine: VoiceEngine, language: string, paid = false): boolean {
  if (engine === 'magpie' && !paid) return false
  const key = normKey(language)
  return TTS[engine].has(key) || TTS[engine].has(language)
}
