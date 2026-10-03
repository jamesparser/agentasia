/**
 * On-device speech-to-text for the prompt box.
 *
 * Why this exists next to useSpeechRecognition: Chrome's
 * `webkitSpeechRecognition` does not transcribe locally - it streams the
 * microphone to Google's speech service. When that service is unreachable the
 * session opens, reports nothing, and ends, which looks to the user like
 * "it says listening but it is not listening". That is a network fact, not
 * something app code can fix.
 *
 * The Live page already solves it with transformers.js models that run in the
 * browser. This hook exposes the same path to worker mode, reusing
 * createSTTProvider so there is one implementation of mic capture, chunking and
 * decoding rather than two.
 *
 * It is opt-in and stays opt-in: the first run downloads a model (whisper-base
 * is ~300MB, cached by the browser afterwards), and downloading a few hundred
 * megabytes on someone's mobile connection without asking would be worse than
 * the error it fixes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { STTProvider } from '@/features/live/lib/types'

export type DeviceTranscriptionState = 'idle' | 'loading' | 'ready' | 'listening' | 'error'

/** Our UI codes to the BCP-47 tag the model expects. */
const WHISPER_LANG: Record<string, string> = {
  en: 'en', th: 'th', lo: 'lo', my: 'my', km: 'km', vi: 'vi', id: 'id',
  ms: 'ms', jv: 'jv', su: 'su', fil: 'fil', ceb: 'ceb', zh: 'zh',
  'zh-CN': 'zh', 'zh-TW': 'zh', yue: 'zh', hi: 'hi', bn: 'bn', ur: 'ur',
  ja: 'ja', ko: 'ko', ar: 'ar', de: 'de', es: 'es', fr: 'fr', pt: 'pt', pl: 'pl', ru: 'ru', kk: 'kk', mn: 'mn', ky: 'ky', uz: 'uz', ne: 'ne',
}

export function whisperLang(code: string | undefined): string {
  if (!code) return 'en'
  return WHISPER_LANG[code] ?? code.split('-')[0]
}

interface Options {
  /** 'whisper' runs a model in the tab; 'assemblyai' records and sends to the gateway. */
  provider?: 'whisper' | 'assemblyai'
  lang?: string
  onTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onError?: (message: string) => void
}

export function useDeviceTranscription({
  provider: providerType = 'whisper',
  lang,
  onTranscript,
  onFinalTranscript,
  onError,
}: Options) {
  const [state, setState] = useState<DeviceTranscriptionState>('idle')
  const providerRef = useRef<STTProvider | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const textRef = useRef('')
  const erroredRef = useRef(false)

  // Keep the latest callbacks without re-creating the provider.
  const cbRef = useRef({ onTranscript, onFinalTranscript, onError })
  useEffect(() => {
    cbRef.current = { onTranscript, onFinalTranscript, onError }
  })

  const teardown = useCallback(async () => {
    unsubRef.current?.()
    unsubRef.current = null
    try {
      await providerRef.current?.stop()
    } catch {
      /* already stopped */
    }
    try {
      await providerRef.current?.dispose()
    } catch {
      /* best effort */
    }
    providerRef.current = null
    setState('idle')
  }, [])

  // A model left loaded after navigating away would hold hundreds of MB of WASM.
  useEffect(() => () => void teardown(), [teardown])

  const start = useCallback(async () => {
    if (providerRef.current && state === 'listening') return
    try {
      if (!providerRef.current) {
        setState('loading')
        const { createSTTProvider } = await import('@/features/live/lib/stt')
        const provider = await createSTTProvider(
          providerType,
          providerType === 'whisper'
            ? {
                // whisper-small is ~500MB; base is the point where a first
                // download is still survivable on a hotel connection, which is
                // the actual audience here. Quality is lower - Settings says so.
                modelId: 'onnx-community/whisper-base-ONNX',
              }
            : undefined,
        )
        await provider.initialize()
        const offError = provider.onError((error) => {
          setState('error')
          erroredRef.current = true
          cbRef.current.onError?.(
            /daily_allowance|allowance/.test(error.message)
              ? "You've used today's free requests. Sign in or come back tomorrow."
              : error.message,
          )
        })
        const offResult = provider.onResult((result) => {
          if (providerType === 'assemblyai') setState('ready')
          if (!result.text) return
          if (result.isFinal) {
            textRef.current = (textRef.current + ' ' + result.text).trim()
            cbRef.current.onFinalTranscript?.(result.text)
          } else {
            cbRef.current.onTranscript?.(
              (textRef.current ? textRef.current + ' ' : '') + result.text,
            )
          }
        })
        unsubRef.current = () => {
          offResult()
          offError()
        }
        providerRef.current = provider
      }
      textRef.current = ''
      erroredRef.current = false
      await providerRef.current.start({ language: whisperLang(lang) })
      setState('listening')
    } catch (error) {
      setState('error')
      cbRef.current.onError?.(
        error instanceof Error ? error.message : 'On-device voice input failed',
      )
    }
  }, [lang, state, providerType])

  const stop = useCallback(async () => {
    const provider = providerRef.current
    if (!provider) return
    // The cloud provider transcribes after the recording ends, so show the
    // spinner until its result (or error) arrives instead of looking idle.
    if (providerType === 'assemblyai') setState('loading')
    try {
      await provider.stop()
    } catch {
      /* ignore */
    }
    // The cloud provider's stop() resolves only after transcription finished
    // (result or error already delivered), so the mic is free again right now.
    // The old 30 second wait left it greyed out after an empty recording,
    // which looked like "worked once, then stopped".
    setState((s) => (s === 'error' ? s : 'ready'))
    if (providerType === 'assemblyai' && !textRef.current && !erroredRef.current) {
      cbRef.current.onError?.('No speech was heard. Tap the microphone and try again.')
    }
  }, [providerType])

  return {
    state,
    isListening: state === 'listening',
    /** True while the model is being fetched for the first time. */
    isWarming: state === 'loading',
    start,
    stop,
    teardown,
  }
}
