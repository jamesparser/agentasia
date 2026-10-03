/**
 * AssemblyAI cloud STT provider.
 *
 * An opt in alternative to the on-device models. The audio leaves the browser
 * only through the AgentAsia gateway (`POST /v1/speech/transcribe`), which holds
 * the AssemblyAI key server side and meters each call per user per day. Nothing
 * here is on any default path: the user has to pick this provider in voice
 * settings, and the on-device Whisper and browser speech engines stay defaults.
 *
 * Batch, not streaming: recording accumulates locally and transcription runs
 * once when you stop talking. One recording is one metered call, which keeps
 * the owner's free credit spend predictable.
 */
import type { STTProvider, STTResult, STTConfig } from '../types'
import { gatewayBase } from '@/lib/llm/managed-lane'
import { gatewayFetch } from '@/lib/auth/gatewayFetch'

const SAMPLE_RATE = 16000

/**
 * AssemblyAI language codes differ from ours in three places (Javanese is jw,
 * Tagalog is tl) and it has no model for Cantonese, Cebuano, Kyrgyz or Tetum.
 * For those we send nothing so the gateway turns language detection on, rather
 * than sending a code the service rejects.
 */
export function assemblyLanguage(language: string | undefined): string | undefined {
  if (!language) return undefined
  const base = language.toLowerCase()
  const map: Record<string, string | undefined> = {
    jv: 'jw', fil: 'tl', tl: 'tl', yue: 'zh', ceb: undefined, ky: undefined, tet: undefined, hmn: undefined, bo: undefined,
  }
  const key = base === 'fil' || base === 'yue' ? base : base.split('-')[0]
  return key in map ? map[key] : key
}

export class AssemblyAISttProvider implements STTProvider {
  readonly type = 'assemblyai' as const

  private stream: MediaStream | null = null
  private captureRate = SAMPLE_RATE
  private audioContext: AudioContext | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private chunks: Float32Array[] = []
  private language: string | undefined
  private isRecordingState = false
  private busy = false

  private resultCallbacks = new Set<(result: STTResult) => void>()
  private errorCallbacks = new Set<(error: Error) => void>()

  get isSupported(): boolean {
    return Boolean(gatewayBase()) && typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices)
  }

  get isLoading(): boolean {
    return this.busy
  }

  get isReady(): boolean {
    return true
  }

  async initialize(): Promise<void> {
    // No model download: readiness depends only on the gateway being set.
  }

  async start(config?: Partial<STTConfig>): Promise<void> {
    if (this.isRecordingState) return
    this.language = config?.language
    this.chunks = []

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    // Safari on iPhones may refuse a custom rate, so fall back and remember the
    // rate that was really used: labelling 48 kHz audio as 16 kHz plays it slow
    // and the transcript comes back empty or wrong.
    try {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    } catch {
      const Ctor = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      this.audioContext = new (Ctor ?? AudioContext)()
    }
    this.captureRate = this.audioContext.sampleRate
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
    const source = this.audioContext.createMediaStreamSource(this.stream)
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => {
      if (!this.isRecordingState) return
      const input = event.inputBuffer.getChannelData(0)
      this.chunks.push(new Float32Array(input))
    }
    source.connect(processor)
    processor.connect(this.audioContext.destination)
    this.scriptProcessor = processor
    this.isRecordingState = true
  }

  async stop(): Promise<void> {
    this.isRecordingState = false

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }

    const captured = this.chunks
    this.chunks = []
    if (!captured.length) return

    const combined = combineBuffers(captured)
    try {
      // The final transcript is delivered through the onResult callbacks,
      // exactly like the streaming on-device providers do it.
      await this.transcribe(combined)
    } catch (error) {
      this.errorCallbacks.forEach((cb) => cb(error as Error))
    }
  }

  /** Transcribe captured audio through the gateway. One call, one metered unit. */
  async transcribe(audioData: Float32Array | ArrayBuffer): Promise<STTResult> {
    const audio = audioData instanceof ArrayBuffer ? new Float32Array(audioData) : audioData
    if (!audio.length) {
      return { text: '', isFinal: true, timestamp: Date.now() }
    }
    this.busy = true
    try {
      const wav = encodeWav(audio, this.captureRate)
      const base64 = bytesToBase64(wav)
      const base = gatewayBase()
      if (!base) throw new Error('gateway_not_configured')

      const res = await gatewayFetch(`${base}/v1/speech/transcribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          ...(assemblyLanguage(this.language) ? { languageCode: assemblyLanguage(this.language) } : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || `speech_http_${res.status}`)
      }
      const result: STTResult = {
        text: body?.text || '',
        isFinal: true,
        language: body?.language,
        timestamp: Date.now(),
      }
      this.resultCallbacks.forEach((cb) => cb(result))
      return result
    } finally {
      this.busy = false
    }
  }

  onResult(callback: (result: STTResult) => void): () => void {
    this.resultCallbacks.add(callback)
    return () => this.resultCallbacks.delete(callback)
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback)
    return () => this.errorCallbacks.delete(callback)
  }

  async dispose(): Promise<void> {
    await this.stop()
    this.resultCallbacks.clear()
    this.errorCallbacks.clear()
  }
}

function combineBuffers(buffers: Float32Array[]): Float32Array {
  const total = buffers.reduce((acc, buf) => acc + buf.length, 0)
  const combined = new Float32Array(total)
  let offset = 0
  for (const buffer of buffers) {
    combined.set(buffer, offset)
    offset += buffer.length
  }
  return combined
}

/** 16 bit PCM WAV header plus samples: the format AssemblyAI ingests directly. */
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }
  return new Uint8Array(buffer)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
