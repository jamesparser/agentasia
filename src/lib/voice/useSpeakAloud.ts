/**
 * Read an assistant reply aloud.
 *
 * Why this exists: text-to-speech was wired into Live mode only, so in worker
 * mode the agent answered in writing and never spoke - which is a strange gap for
 * a product whose slogan is "AI that speaks your language".
 *
 * Why it uses the device rather than a downloaded model: the browser's own
 * `speechSynthesis` needs no network, no WebGPU and no bundle weight, and macOS /
 * Windows / Android ship voices for most of the languages this product targets.
 * `resolveVoicePlan` is told which voices exist so it can rank them; that is what
 * turns 6 "speakable" languages into however many the visitor's device actually
 * has.
 *
 * The one rule kept from src/lib/voice/language-coverage.ts: when the language is
 * not speakable, say so. Speaking Thai text with an English voice is worse than
 * saying nothing, because it sounds like the product works and does not.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { resolveVoicePlan } from './language-coverage'
import { warningToast } from '@/lib/toast'

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null

/** `getVoices()` is empty until the list loads; Chrome fires `voiceschanged`. */
function useDeviceVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const s = synth()
    if (!s) return
    const read = () => setVoices(s.getVoices())
    read()
    s.addEventListener('voiceschanged', read)
    return () => s.removeEventListener('voiceschanged', read)
  }, [])
  return voices
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice | null {
  const wanted = language.toLowerCase()
  const base = wanted.split('-')[0]
  return (
    voices.find((v) => v.lang.toLowerCase() === wanted) ||
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === wanted) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(`${base}-`)) ||
    voices.find((v) => v.lang.toLowerCase() === base) ||
    null
  )
}

/** Break text into pieces of at most `max` characters on sentence boundaries. */
export function splitForSpeech(text: string, max = 200): string[] {
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const raw of sentences) {
    let sentence = raw
    while (sentence.length > max) {
      const cut = sentence.lastIndexOf(' ', max)
      const at = cut > max / 2 ? cut : max
      if (cur) { out.push(cur.trim()); cur = '' }
      out.push(sentence.slice(0, at).trim())
      sentence = sentence.slice(at)
    }
    if ((cur + sentence).length > max) { if (cur) out.push(cur.trim()); cur = sentence } else cur += sentence
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean)
}

export interface SpeakAloud {
  /** True while a reply is being read out. */
  isSpeaking: boolean
  /** Whether this browser has any speech synthesis at all. */
  supported: boolean
  /** Whether the current language has a voice on this device. */
  canSpeak: boolean
  speak: (text: string) => void
  stop: () => void
}

export function useSpeakAloud(language: string): SpeakAloud {
  const voices = useDeviceVoices()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const s = synth()
  const supported = Boolean(s)

  // `device` is the engine this hook can actually use, so ask the resolver which
  // device voice (if any) covers this language rather than deciding here.
  const plan = resolveVoicePlan(language, {
    deviceVoices: voices.map((v) => v.lang),
    engines: ['device'],
  })
  const voice = pickVoice(voices, language)
  const canSpeak = supported && plan.speakable && Boolean(voice)

  // Utterances outlive the component; leaving one running after unmount would
  // keep talking over the next screen.
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    const synthInstance = synth()
    return () => {
      utterRef.current = null
      synthInstance?.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    s?.cancel()
    setIsSpeaking(false)
  }, [s])

  const speak = useCallback(
    (text: string) => {
      if (!s) {
        warningToast('Speech is not available in this browser')
        return
      }
      const clean = text.replace(/```[\s\S]*?```/g, ' ').trim()
      if (!clean) return

      if (!plan.speakable || !voice) {
        warningToast(
          'No voice for this language yet',
          'This reply will stay in text. Voice coverage is listed on the About page.',
        )
        return
      }

      // Toggle: pressing the button on a reply that is already being read stops it.
      if (isSpeaking) {
        s.cancel()
        setIsSpeaking(false)
        return
      }

      s.cancel()
      // Chrome silently stops a single utterance after roughly 15 seconds, so a
      // long reply goes out as short sentence-sized pieces queued in order.
      const chunks = splitForSpeech(clean)
      const utterances = chunks.map((piece, i) => {
        const u = new SpeechSynthesisUtterance(piece)
        u.voice = voice
        u.lang = voice.lang
        u.rate = 1
        const last = i === chunks.length - 1
        u.onend = () => {
          if (last) setIsSpeaking(false)
        }
        u.onerror = (e) => {
          // 'canceled' and 'interrupted' are our own stop; anything else ends the read.
          if (e.error !== 'canceled' && e.error !== 'interrupted') setIsSpeaking(false)
        }
        return u
      })
      utterRef.current = utterances[utterances.length - 1] ?? null
      setIsSpeaking(true)
      // Chrome drops a speak() issued in the same tick as cancel(), which sounds
      // like the speaker button doing nothing. A short defer avoids it.
      window.setTimeout(() => utterances.forEach((u) => s.speak(u)), 60)
    },
    [s, voice, plan.speakable, isSpeaking],
  )

  return { isSpeaking, supported, canSpeak, speak, stop }
}
