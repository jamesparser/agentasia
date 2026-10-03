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
import { infoToast, warningToast, errorToast } from '@/lib/toast'
import { hasMmsVoice, preloadMms, synthesizeMms, MMS_SAMPLE_RATE } from './mms-tts'

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

/**
 * Score a device voice by how natural it usually sounds. Browsers expose the
 * same language through very different engines: Edge "Online (Natural)" and
 * Chrome "Google" voices are neural and sound human, macOS "Premium" and
 * "Enhanced" voices are good, while "Compact" and plain eSpeak voices are the
 * robotic ones. Picking the best one for the language is the cheapest quality
 * win there is, because it needs no download and no server.
 */
export function voiceQuality(v: Pick<SpeechSynthesisVoice, 'name' | 'localService'>): number {
  const n = v.name.toLowerCase()
  let score = 0
  if (/natural|neural|online/.test(n)) score += 100
  if (/premium|enhanced|siri/.test(n)) score += 80
  if (/^google /.test(n)) score += 60
  if (/compact|espeak|\bfred\b|\bzarvox\b|\bbad news\b|\bwhisper\b/.test(n)) score -= 100
  if (!v.localService) score += 10
  return score
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice | null {
  const wanted = language.toLowerCase()
  const base = wanted.split('-')[0]
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-')
  const best = (list: SpeechSynthesisVoice[]) =>
    list.length ? [...list].sort((x, y) => voiceQuality(y) - voiceQuality(x))[0] : null
  return (
    best(voices.filter((v) => norm(v) === wanted)) ||
    best(voices.filter((v) => norm(v).startsWith(`${base}-`) || norm(v) === base)) ||
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
  const deviceOk = supported && plan.speakable && Boolean(voice)
  // No voice on this device: fall back to the free in-browser model if one exists.
  const mmsOk = !deviceOk && hasMmsVoice(language)
  const canSpeak = deviceOk || mmsOk

  // Playback state for the in-browser voice.
  const runRef = useRef(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const stopMms = useCallback(() => {
    runRef.current += 1
    try { sourceRef.current?.stop() } catch { /* already ended */ }
    sourceRef.current = null
  }, [])

  // Utterances outlive the component; leaving one running after unmount would
  // keep talking over the next screen.
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    const synthInstance = synth()
    return () => {
      utterRef.current = null
      synthInstance?.cancel()
      stopMms()
    }
  }, [stopMms])

  const stop = useCallback(() => {
    s?.cancel()
    stopMms()
    setIsSpeaking(false)
  }, [s, stopMms])

  const speakMms = useCallback(
    async (clean: string) => {
      if (isSpeaking) {
        stopMms()
        setIsSpeaking(false)
        return
      }
      const run = ++runRef.current
      setIsSpeaking(true)
      try {
        infoToast(
          'Preparing the voice',
          'The first time, a voice file of about 100 MB downloads and is kept on this device. After that it starts quickly.',
        )
        await preloadMms(language)
        const ctx = (ctxRef.current ??= new AudioContext({ sampleRate: MMS_SAMPLE_RATE }))
        if (ctx.state === 'suspended') await ctx.resume()
        for (const piece of splitForSpeech(clean, 160)) {
          if (runRef.current !== run) return
          const samples = await synthesizeMms(language, piece)
          if (runRef.current !== run) return
          if (!samples.length) continue
          const buffer = ctx.createBuffer(1, samples.length, MMS_SAMPLE_RATE)
          buffer.copyToChannel(new Float32Array(samples), 0)
          await new Promise<void>((resolve) => {
            const src = ctx.createBufferSource()
            src.buffer = buffer
            src.connect(ctx.destination)
            src.onended = () => resolve()
            sourceRef.current = src
            src.start()
          })
        }
      } catch (error) {
        console.error('[speak-aloud] in-browser voice failed', error)
        errorToast('The voice could not start', 'This reply stays in text.')
      } finally {
        if (runRef.current === run) setIsSpeaking(false)
      }
    },
    [language, isSpeaking, stopMms],
  )

  const speak = useCallback(
    (text: string) => {
      const clean = text.replace(/```[\s\S]*?```/g, ' ').trim()
      if (!clean) return
      if (mmsOk) {
        void speakMms(clean)
        return
      }
      if (!s) {
        warningToast('Speech is not available in this browser')
        return
      }

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
    [s, voice, plan.speakable, isSpeaking, mmsOk, speakMms],
  )

  return { isSpeaking, supported, canSpeak, speak, stop }
}
