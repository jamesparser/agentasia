// AgentAsia cloud speech tool. AssemblyAI hosts two things we do not run locally:
// a transcription model (Universal) and an audio understanding model (LeMUR).
// Both are opt in at the client, metered per user at the gateway, and the API key
// never reaches the browser. Nothing here is on any default path: on-device
// Whisper and the browser's own speech engine stay the defaults.
const BASE = process.env.ASSEMBLYAI_BASE_URL || 'https://api.assemblyai.com'

// Uploads above this are refused before they leave the gateway. A one hour
// meeting at 128 kbps opus is under 60 MB, so this covers real recordings
// while an abusive caller cannot push unlimited bytes through the tunnel.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const POLL_MS = 3000
const POLL_MAX = 60

export function assemblyConfigured(env = process.env) {
  return Boolean(env.ASSEMBLYAI_API_KEY)
}

async function aai(path, options, env) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { authorization: env.ASSEMBLYAI_API_KEY, ...(options.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = new Error(body?.error || `assemblyai_http_${res.status}`)
    e.statusCode = res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502
    throw e
  }
  return body
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Upload raw audio bytes and return the upload url AssemblyAI hands back. */
export async function uploadAudio(bytes, env = process.env) {
  const body = await aai('/v2/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: bytes,
  }, env)
  if (!body?.upload_url) {
    const e = new Error('assemblyai_upload_failed')
    e.statusCode = 502
    throw e
  }
  return body.upload_url
}

/**
 * Transcribe audio through the Universal speech model.
 * @param {{audioBase64:string, languageCode?:string}} input
 * @returns {Promise<{id:string,text:string,language?:string,audioDuration?:number}>}
 */
export async function transcribeAudio(input, env = process.env) {
  const audioBase64 = input?.audioBase64
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    const e = new Error('audio_required')
    e.statusCode = 400
    throw e
  }
  const bytes = Buffer.from(audioBase64, 'base64')
  if (!bytes.length) {
    const e = new Error('audio_required')
    e.statusCode = 400
    throw e
  }
  if (bytes.length > MAX_AUDIO_BYTES) {
    const e = new Error('audio_too_large')
    e.statusCode = 413
    throw e
  }
  const uploadUrl = await uploadAudio(bytes, env)
  const created = await aai('/v2/transcripts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: uploadUrl,
      speech_model: 'universal',
      ...(input.languageCode ? { language_code: String(input.languageCode) } : {}),
    }),
  }, env)
  if (!created?.id) {
    const e = new Error('assemblyai_transcript_rejected')
    e.statusCode = 502
    throw e
  }
  for (let i = 0; i < POLL_MAX; i += 1) {
    await sleep(POLL_MS)
    const t = await aai(`/v2/transcripts/${created.id}`, {}, env)
    if (t.status === 'completed') {
      return {
        id: t.id,
        text: t.text || '',
        language: t.language_code || undefined,
        audioDuration: typeof t.audio_duration === 'number' ? t.audio_duration : undefined,
      }
    }
    if (t.status === 'error') {
      const e = new Error(t.error || 'assemblyai_transcription_failed')
      e.statusCode = 502
      throw e
    }
  }
  const e = new Error('assemblyai_transcription_timeout')
  e.statusCode = 504
  throw e
}

/**
 * Ask LeMUR a question about an existing transcript or raw text.
 * @param {{transcriptId?:string, text?:string, prompt:string, maxTokens?:number}} input
 * @returns {Promise<{response:string, requestId?:string}>}
 */
export async function understandSpeech(input, env = process.env) {
  const prompt = input?.prompt ? String(input.prompt) : ''
  if (!prompt.trim()) {
    const e = new Error('prompt_required')
    e.statusCode = 400
    throw e
  }
  if (!input?.transcriptId && !input?.text) {
    const e = new Error('transcript_or_text_required')
    e.statusCode = 400
    throw e
  }
  const maxTokens = Math.min(4000, Math.max(100, Number(input.maxTokens) || 512))
  const payload = {
    prompt,
    max_tokens: maxTokens,
    ...(input.transcriptId ? { transcript_ids: [String(input.transcriptId)] } : { input_text: String(input.text) }),
  }
  const out = await aai('/lemur/v3/generate/task', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }, env)
  return { response: out?.response || '', requestId: out?.request_id || undefined }
}
