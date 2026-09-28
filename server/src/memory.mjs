// AgentAsia memory layer — the Crest Gem.
// Two interchangeable backends behind one interface so the hackathon can use the
// hosted platform (zero infra) while the product can move to self-hosted OSS
// without touching call sites.
const MEM0_BASE = () => (process.env.MEM0_API_URL || 'https://api.mem0.ai').replace(/\/+$/, '')

function headers(env) {
  const key = env.MEM0_API_KEY
  if (!key) { const e = new Error('mem0_not_configured'); e.statusCode = 503; throw e }
  // Mem0 platform auth is `Token <key>`; Authorization: Bearer also accepted on some SDKs.
  return { 'content-type': 'application/json', authorization: `Token ${key}` }
}

/** Memories are keyed to a stable uid, never to a device or a browser store. */
function scope({ userId, agentId = 'agentasia-naga' }) {
  if (!userId) { const e = new Error('user_id_required'); e.statusCode = 400; throw e }
  return { user_id: String(userId), agent_id: String(agentId) }
}

export async function addMemory({ messages, userId, agentId }, env = process.env) {
  const body = { ...scope({ userId, agentId }), messages, infer: true }
  const res = await fetch(`${MEM0_BASE()}/v1/memories/`, {
    method: 'POST', headers: headers(env), body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(out?.error || `mem0_http_${res.status}`); e.statusCode = res.status === 401 ? 401 : 502; throw e }
  return out
}

export async function searchMemory({ query, userId, agentId, limit = 5 }, env = process.env) {
  const body = { ...scope({ userId, agentId }), query, limit: Math.min(50, Math.max(1, Number(limit) || 5)) }
  const res = await fetch(`${MEM0_BASE()}/v1/memories/search/`, {
    method: 'POST', headers: headers(env), body: JSON.stringify(body),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(out?.error || `mem0_http_${res.status}`); e.statusCode = res.status === 401 ? 401 : 502; throw e }
  const results = Array.isArray(out.results) ? out.results : Array.isArray(out) ? out : []
  return { query, results, source: 'mem0', count: results.length }
}

/** Privacy requirement: export and erase must exist for a Personal AI entry. */
export async function deleteAllMemory({ userId, agentId }, env = process.env) {
  const s = scope({ userId, agentId })
  const res = await fetch(`${MEM0_BASE()}/v1/memories/?user_id=${encodeURIComponent(s.user_id)}&agent_id=${encodeURIComponent(s.agent_id)}`,
    { method: 'DELETE', headers: headers(env) })
  if (!res.ok) { const e = new Error(`mem0_delete_http_${res.status}`); e.statusCode = 502; throw e }
  return { deleted: true, userId: s.user_id }
}
