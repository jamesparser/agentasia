import { useState, useEffect, useRef, useCallback } from 'react'
import { warningToast } from '@/lib/toast'
import { useDeviceTranscription } from './useDeviceTranscription'

const CONSENT_KEY = 'agentasia:stt-device-consent'

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported'

interface UseSpeechRecognitionOptions {
  lang?: string
  /**
   * 'browser' uses webkitSpeechRecognition (streams to Google, fails offline and
   * wherever that host is blocked). 'device' runs whisper in the tab. Defaults to
   * 'browser'; the caller reads the user's preference.
   */
  engine?: 'browser' | 'device'
  onTranscript?: (transcript: string) => void
  /**
   * Hands the finished text to the caller.
   *
   * It has to be a parameter, not just a signal. The old signature was
   * `() => void`, and PromptArea responded by calling
   * `setPrompt(transcript)` and then `onSubmitToAgent()` with no argument in the
   * same tick. React had not flushed the state yet, so the submit handler read
   * the previous (empty) prompt, bailed on its own `!prompt.trim()` guard, and
   * the agent never answered - which is what "I talked and it did not respond"
   * actually was.
   */
  onFinalTranscript?: (transcript: string) => void
  onError?: (error: SpeechRecognitionErrorCode) => void
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean
  isSupported: boolean
  /** Model download in progress (device engine only). */
  isWarming: boolean
  startRecording: () => void
  stopRecording: () => void
  toggleRecording: () => void
}

export function useSpeechRecognition({
  lang,
  engine = 'browser',
  onTranscript,
  onFinalTranscript,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false)

  /* Called unconditionally because hooks cannot be conditional; it is lazy in
     practice - no model is fetched until start() runs, so choosing the browser
     engine costs nothing. */
  const device = useDeviceTranscription({
    lang,
    onTranscript,
    onFinalTranscript,
    onError: (message) => warningToast('On-device voice input failed', message),
  })
  const [isSupported, setIsSupported] = useState(false)
  const [supportChecked, setSupportChecked] = useState(false)
  // True once the browser engine has failed in a way only the on-device engine can
  // fix (speech service unreachable, language unsupported) and the user agreed to
  // the one-time model download.
  const [forceDevice, setForceDevice] = useState(false)
  const fallbackRef = useRef<(() => boolean) | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  // onresult stops the session and onend fires too; without this the same
  // utterance would submit twice.
  const deliveredRef = useRef(false)

  // Store callbacks in refs to avoid effect re-runs
  const onTranscriptRef = useRef(onTranscript)
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onFinalTranscriptRef.current = onFinalTranscript
    onErrorRef.current = onError
  })

  // Check support once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    setIsSupported(!!SpeechRecognition)
    setSupportChecked(true)
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang || navigator.language || 'en-US'

    recognition.onstart = () => {
      finalTranscriptRef.current = ''
      deliveredRef.current = false
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        console.debug('🎙', transcript)
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }
      finalTranscriptRef.current = finalTranscript
      const newTranscript = finalTranscript + interimTranscript

      onTranscriptRef.current?.(newTranscript)

      if (finalTranscript) {
        deliveredRef.current = true
        recognition.stop()
        onFinalTranscriptRef.current?.(finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      const errorCode = event.error as SpeechRecognitionErrorCode
      console.error('Speech recognition error:', errorCode)
      setIsRecording(false)

      // Provide user-friendly error messages
      switch (errorCode) {
        case 'network':
          // Chrome does not transcribe locally: webkitSpeechRecognition streams
          // audio to Google's speech service. When that host is unreachable the
          // session opens, says nothing, and ends - which looks exactly like "it
          // is listening but not hearing me". Say so, and name the path that
          // does transcribe on-device (Live mode's whisper/granite engines).
          if (fallbackRef.current?.()) break
          warningToast(
            'Voice input could not reach the transcription service',
            'This browser sends speech to Google for transcription and that call failed. Try Live mode, which transcribes on your device.',
          )
          break
        case 'not-allowed':
        case 'service-not-allowed':
          warningToast(
            'Microphone access denied',
            'Please allow microphone access in your browser settings',
          )
          break
        case 'audio-capture':
          warningToast(
            'No microphone found',
            'Please connect a microphone and try again',
          )
          break
        case 'no-speech':
          // Silent error - no speech detected is not necessarily an error
          break
        case 'language-not-supported':
          if (fallbackRef.current?.()) break
          warningToast(
            'This browser cannot transcribe this language',
            'Try Live mode, which uses an on-device model instead.',
          )
          break
        case 'aborted':
          // User aborted, no need to show error
          break
        default:
          warningToast('Speech recognition error', errorCode)
      }

      onErrorRef.current?.(errorCode)
    }

    recognition.onend = () => {
      setIsRecording(false)
      const text = finalTranscriptRef.current.trim()
      if (text && !deliveredRef.current) {
        deliveredRef.current = true
        onFinalTranscriptRef.current?.(text)
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [lang])

  const startRecording = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || isRecording) return

    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || !isRecording) return

    recognition.stop()
    setIsRecording(false)
  }, [isRecording])

  // Browsers without webkitSpeechRecognition (Firefox, some Chromium builds) and
  // browsers whose speech service is unreachable both end up on the device engine,
  // so the mic works instead of silently doing nothing.
  const useDevice =
    engine === 'device' || forceDevice || (supportChecked && !isSupported)

  fallbackRef.current = () => {
    if (typeof window === 'undefined') return false
    let agreed = false
    try {
      agreed = localStorage.getItem(CONSENT_KEY) === '1'
    } catch {
      /* private mode: ask every time */
    }
    if (!agreed) {
      agreed = window.confirm(
        'This browser cannot reach its speech service. Switch to on-device voice input? It downloads a speech model (a few hundred MB) once, then works without a connection.',
      )
      if (!agreed) return false
      try {
        localStorage.setItem(CONSENT_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    setIsRecording(false)
    setForceDevice(true)
    void device.start()
    return true
  }

  const toggleRecording = useCallback(() => {
    if (useDevice) {
      if (device.isListening) void device.stop()
      // Reaching the device engine by fallback (not by the user's own setting)
      // still needs the one-time download consent.
      else if (engine === 'device' || forceDevice) void device.start()
      else fallbackRef.current?.()
      return
    }
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [useDevice, engine, forceDevice, device, isRecording, startRecording, stopRecording])

  if (useDevice) {
    return {
      isRecording: device.isListening,
      // The device engine works wherever WebAssembly does, including the
      // networks that break the browser engine.
      isSupported: true,
      isWarming: device.isWarming,
      startRecording: () => void device.start(),
      stopRecording: () => void device.stop(),
      toggleRecording,
    }
  }

  return {
    isRecording,
    isSupported,
    isWarming: false,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}
