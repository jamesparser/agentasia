// AgentAsia memory — the Crest Gem.
//
// Design rule (deliberate, and part of the pitch): **we do not run everyone's
// memory on our server.** A single shared store under one vendor key means every
// user's life details land on infrastructure we operate and can read - the exact
// opposite of an "always-on, private assistant", and a liability we would carry
// for data we do not need.
//
// So memory is user-owned, in this order:
//   1. LOCAL-FIRST (default): encrypted in the user's own browser. Already built:
//      lib/crypto/content-encryption.ts (AES-GCM-256 field-level, at rest in
//      IndexedDB) + local-backup/OPFS. Nothing of theirs reaches us at all.
//   2. BYOK: the user pastes their OWN Mem0 key (or any memory API) in Settings.
//      The key is used per request and never stored, logged, or reused.
//   3. AGGREGATOR MCP: they connect one Composio/Pipedream/Zapier endpoint and get
//      memory + email + drive + everything else, in THEIR account, not ours.
//
// The gateway therefore has no memory database and no shared vendor account.

const DEFAULT_URL = 'https://api.mem0.ai'

/** Pull a *transient* per-request key. Never persisted, never echoed back. */
function requireKey(body = {}) {
  const key = String(body.api_key || body.apiKey || '').trim()
  if (!key) {
    const e = new Error('memory_key_required')
    e.statusCode = 401
    e.hint = 'AgentAsia does not host user memory. Use local encrypted memory, '
      + 'add your own Mem0 key, or connect a memory MCP server.'
    throw e
  }
  if (key.length < 8) { const e = new Error('memory_key_invalid'); e.statusCode = 400; throw e }
  return key
}

function base(body = {}) {
  const raw = String(body.api_url || body.apiUrl || DEFAULT_URL).trim()
  if (!/^https:\/\//i.test(raw)) { const e = new Error('memory_url_must_be_https'); e.statusCode = 400; throw e }
  return raw.replace(/\/+$/, '')
}

function scope(body = {}) {
  const userId = String(body.userId || body.user_id || '').trim()
  if (!userId) { const e = new Error('user_id_required'); e.statusCode = 400; throw e }
  return { user_id: userId, agent_id: String(body.agentId || 'agentasia-naga') }
}

function headers(key) {
  return { 'content-type': 'application/json', authorization: `Token ${key}` }
}

async function post(url, key, body) {
  const res = await fetch(url, { method: 'POST', headers: headers(key), body: JSON.stringify(body) })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = new Error(out?.error?.detail || out?.error || `memory_http_${res.status}`)
    e.statusCode = res.status === 401 || res.status === 403 ? 401 : 502
    throw e
  }
  return out
}

export async function addMemory(body = {}) {
  const key = requireKey(body)
  try {
    return await post(`${base(body)}/v1/memories/`, key, {
      ...scope(body), messages: body.messages, infer: body.infer !== false,
    })
  } finally { body.api_key = undefined; body.apiKey = undefined }
}

export async function searchMemory(body = {}) {
  const key = requireKey(body)
  try {
    const out = await post(`${base(body)}/v1/memories/search/`, key, {
      ...scope(body), query: String(body.query || ''),
      limit: Math.min(50, Math.max(1, Number(body.limit) || 5)),
    })
    const results = Array.isArray(out.results) ? out.results : Array.isArray(out) ? out : []
    return { query: body.query, results, count: results.length, source: 'user_mem0' }
  } finally { body.api_key = undefined; body.apiKey = undefined }
}

/** Erasure has to exist for a Personal AI entry - and it runs on THEIR account. */
export async function deleteAllMemory(body = {}) {
  const key = requireKey(body)
  const s = scope(body)
  try {
    const res = await fetch(`${base(body)}/v1/memories/?user_id=${encodeURIComponent(s.user_id)}&agent_id=${encodeURIComponent(s.agent_id)}`,
      { method: 'DELETE', headers: headers(key) })
    if (!res.ok) { const e = new Error(`memory_delete_http_${res.status}`); e.statusCode = 502; throw e }
    return { deleted: true, userId: s.user_id }
  } finally { body.api_key = undefined; body.apiKey = undefined }
}

/** What the client needs to render the memory settings screen honestly. */
export const memoryPolicy = {
  hostedByAgentAsia: false,
  defaultBackend: 'local-encrypted',
  options: ['local-encrypted', 'byok-mem0', 'aggregator-mcp'],
  // No key is ever stored, logged, or reused by the gateway.
  keyRetention: 'none',
}
