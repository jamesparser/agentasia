import assert from 'node:assert/strict'
import http from 'node:http'
import { transcribeAudio, understandSpeech, assemblyConfigured, uploadAudio } from '../src/tools/assemblyai.mjs'
import { assertAudioAllowance, recordAudio, usageToday, usageReport } from '../src/entitlements.mjs'

// Stub AssemblyAI so tests run offline and never need a key. The env override
// ASSEMBLYAI_BASE_URL exists so this suite can point the module at the stub.
const calls = []
const stub = http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', async () => {
    calls.push({ path: req.url, auth: req.headers.authorization, body: raw })
    if (req.url === '/v2/upload') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ upload_url: 'https://stub.example/audio' }))
    }
    if (req.url === '/v2/transcripts') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ id: 'tr_1', status: 'queued' }))
    }
    if (req.url === '/v2/transcripts/tr_1') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({
        id: 'tr_1',
        status: 'completed',
        text: 'hello from the stub',
        language_code: 'en',
        audio_duration: 1.5,
      }))
    }
    if (req.url === '/lemur/v3/generate/task') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ response: 'the meeting covered pricing', request_id: 'rq_9' }))
    }
    res.writeHead(404)
    res.end('{}')
  })
})
await new Promise((r) => stub.listen(0, '127.0.0.1', r))
const port = stub.address().port
const origFetch = globalThis.fetch
globalThis.fetch = (url, opts) => origFetch(url.toString().replace(/^https:\/\/api\.assemblyai\.com/, `http://127.0.0.1:${port}`), opts)

const env = { ASSEMBLYAI_API_KEY: 'aai-test', ASSEMBLYAI_BASE_URL: `http://127.0.0.1:${port}` }
assert.equal(assemblyConfigured(env), true)
assert.equal(assemblyConfigured({}), false)

// Validation fails before any network call. Node's base64 decoder ignores
// characters it does not accept, so "not really base64" still decodes to bytes;
// only input that decodes to zero bytes is rejected here, and the size cap is
// the real abuse boundary.
await assert.rejects(() => transcribeAudio({}, env), /audio_required/)
await assert.rejects(() => transcribeAudio({ audioBase64: '   ' }, env), /audio_required/)
await assert.rejects(() => understandSpeech({ transcriptId: 'tr_1' }, env), /prompt_required/)
await assert.rejects(() => understandSpeech({ prompt: 'summarize' }, env), /transcript_or_text_required/)

const out = await transcribeAudio({ audioBase64: Buffer.from('fake-bytes').toString('base64') }, env)
assert.equal(out.text, 'hello from the stub')
assert.equal(out.language, 'en')
assert.equal(out.audioDuration, 1.5)
assert.equal(calls[0].auth, 'aai-test', 'key sent in the authorization header, never logged')
assert.equal(calls[1].path, '/v2/transcripts')
assert.equal(JSON.parse(calls[1].body).speech_model, 'universal')

const answer = await understandSpeech({ transcriptId: 'tr_1', prompt: 'what was decided?', maxTokens: 99 }, env)
assert.equal(answer.response, 'the meeting covered pricing')
const lemurBody = JSON.parse(calls.at(-1).body)
assert.deepEqual(lemurBody.transcript_ids, ['tr_1'])
assert.equal(lemurBody.max_tokens, 100, 'max_tokens clamped to the documented floor')

// Metering: the audio counter lives beside searches and answers 429 when spent.
const tmp = '/tmp/assemblyai-test-usage.json'
try { await (await import('node:fs/promises')).unlink(tmp) } catch {}
const meterEnv = { USAGE_FILE: tmp }
const entitlement = { plan: 'free', dailyAudio: 2, dailyRequests: 25, dailyTokens: 1000, dailySearches: 5, maxTokens: 100 }
await assertAudioAllowance('uid-a', entitlement, meterEnv)
await recordAudio('uid-a', meterEnv)
await assertAudioAllowance('uid-a', entitlement, meterEnv)
await recordAudio('uid-a', meterEnv)
await assert.rejects(() => assertAudioAllowance('uid-a', entitlement, meterEnv), /daily_audio_allowance_reached/)
const used = await usageToday('uid-a', meterEnv)
assert.equal(used.audio, 2)
const report = await usageReport(null, meterEnv)
assert.equal(report.limits.audio, 10, 'anonymous report shows the free audio ceiling')
assert.equal(report.remaining.audio, 10)

globalThis.fetch = origFetch
stub.close()
console.log('assemblyai (cloud speech) tests passed')
