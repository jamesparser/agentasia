/**
 * Free fallback voices for languages that browsers rarely ship a voice for.
 *
 * Meta's MMS-TTS models (VITS, ONNX, about 100 MB each) run in the visitor's
 * browser, so nothing is sent to a server. The ONNX conversions come from the
 * public `willwade/mms-tts-multilingual-models-onnx` repository.
 *
 * Be honest about what this is:
 *  - Quality is basic and clearly synthetic. It is a fallback, used only when the
 *    device has no voice of its own for the language.
 *  - The MMS models are CC-BY-NC 4.0 (non commercial). Fine for the hackathon and
 *    for free beta use; before charging for the product, replace this with a
 *    commercially licensed voice (for example a cloud TTS) or get legal advice.
 *
 * Verified 2026-10-03: Khmer synthesised here and sent back through speech to
 * text came back as the same Khmer words. Blank token 0 is interspersed between
 * symbols (the model was trained with that), the other variants were not
 * intelligible.
 */

export const MMS_REPO =
  'https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/main'

export const MMS_SAMPLE_RATE = 16000

interface MmsVoice {
  /** Folder in the model repository. */
  dir: string
  /** Latin or Cyrillic vocabularies are lowercase only. */
  lowercase?: boolean
}

/** App language code to MMS model. Only languages with a published model. */
export const MMS_VOICES: Record<string, MmsVoice> = {
  km: { dir: 'khm' },
  lo: { dir: 'lao' },
  my: { dir: 'mya' },
  th: { dir: 'tha' },
  jv: { dir: 'jav', lowercase: true },
  fil: { dir: 'tgl', lowercase: true },
  kk: { dir: 'kaz', lowercase: true },
  mn: { dir: 'mon', lowercase: true },
  ky: { dir: 'kir', lowercase: true },
  uz: { dir: 'uzb-script_cyrillic', lowercase: true },
}

export function hasMmsVoice(language: string): boolean {
  return baseLang(language) in MMS_VOICES
}

function baseLang(language: string): string {
  const l = language.toLowerCase()
  return l === 'fil' || l === 'yue' ? l : l.split('-')[0]
}

/** Parse a sherpa style tokens.txt ("symbol id" per line; the symbol may be a space). */
export function parseTokens(raw: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of raw.split('\n')) {
    const at = line.lastIndexOf(' ')
    if (at < 0) continue
    const id = Number(line.slice(at + 1))
    if (!Number.isInteger(id)) continue
    map.set(line.slice(0, at), id)
  }
  return map
}

/** Text to model input: known symbols only, blank (0) between every symbol. */
export function encodeText(
  text: string,
  tokens: Map<string, number>,
  lowercase = false,
): number[] {
  const src = lowercase ? text.toLowerCase() : text
  const ids: number[] = []
  for (const ch of src.normalize('NFC')) {
    const id = tokens.get(ch)
    if (id !== undefined) ids.push(id)
  }
  if (!ids.length) return []
  const out: number[] = [0]
  for (const id of ids) out.push(id, 0)
  return out
}

type OrtModule = typeof import('onnxruntime-web/wasm')
type Session = import('onnxruntime-web/wasm').InferenceSession

interface Loaded {
  ort: OrtModule
  session: Session
  tokens: Map<string, number>
  lowercase: boolean
}

const loaded = new Map<string, Promise<Loaded>>()
const CACHE = 'agentasia-mms-v1'

async function fetchCached(
  url: string,
  onProgress?: (fraction: number) => void,
): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try {
    cache = 'caches' in globalThis ? await caches.open(CACHE) : null
    const hit = await cache?.match(url)
    if (hit) return await hit.arrayBuffer()
  } catch {
    cache = null
  }
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`mms_download_${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    got += value.length
    if (total && onProgress) onProgress(Math.min(1, got / total))
  }
  const bytes = new Uint8Array(got)
  let off = 0
  for (const p of parts) {
    bytes.set(p, off)
    off += p.length
  }
  try {
    await cache?.put(url, new Response(bytes.slice().buffer))
  } catch {
    // Storage full or blocked: the voice still works, it just downloads again next time.
  }
  return bytes.buffer
}

function load(language: string, onProgress?: (fraction: number) => void): Promise<Loaded> {
  const voice = MMS_VOICES[baseLang(language)]
  if (!voice) return Promise.reject(new Error('mms_unsupported_language'))
  let p = loaded.get(voice.dir)
  if (!p) {
    p = (async () => {
      const ort = (await import('onnxruntime-web/wasm')) as OrtModule
      const wasmUrl = (await import('onnxruntime-web/ort-wasm-simd-threaded.wasm?url')).default
      ort.env.wasm.wasmPaths = { wasm: wasmUrl } as never
      ort.env.wasm.numThreads = 1
      const [tokenText, model] = await Promise.all([
        fetchCached(`${MMS_REPO}/${voice.dir}/tokens.txt`).then((b) =>
          new TextDecoder().decode(b),
        ),
        fetchCached(`${MMS_REPO}/${voice.dir}/model.onnx`, onProgress),
      ])
      const session = await ort.InferenceSession.create(new Uint8Array(model), {
        executionProviders: ['wasm'],
      })
      return {
        ort,
        session,
        tokens: parseTokens(tokenText),
        lowercase: Boolean(voice.lowercase),
      }
    })()
    loaded.set(voice.dir, p)
    // A failed load must not be cached, or the voice stays broken until reload.
    p.catch(() => loaded.delete(voice.dir))
  }
  return p
}

/** Start downloading a voice ahead of the first use. */
export function preloadMms(language: string, onProgress?: (fraction: number) => void) {
  return load(language, onProgress).then(() => undefined)
}

export async function synthesizeMms(
  language: string,
  text: string,
  onProgress?: (fraction: number) => void,
): Promise<Float32Array> {
  const { ort, session, tokens, lowercase } = await load(language, onProgress)
  const ids = encodeText(text, tokens, lowercase)
  if (!ids.length) return new Float32Array(0)
  const out = await session.run({
    x: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    x_length: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    noise_scale: new ort.Tensor('float32', Float32Array.from([0.667]), [1]),
    length_scale: new ort.Tensor('float32', Float32Array.from([1]), [1]),
    noise_scale_w: new ort.Tensor('float32', Float32Array.from([0.8]), [1]),
  })
  return out.y.data as Float32Array
}
