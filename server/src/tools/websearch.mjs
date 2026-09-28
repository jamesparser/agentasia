// AgentAsia web-search tool — Tavily is the runtime source of truth for anything
// the assistant says out loud. A voice assistant that answers weather/sports/prices
// from model weights confidently lies audibly, so live facts MUST be retrieved.
const TAVILY_URL = process.env.TAVILY_BASE_URL || 'https://api.tavily.com/search'

export function searchConfigured(env = process.env) {
  return Boolean(env.TAVILY_API_KEY)
}

/** Normalised, citation-ready shape shared by UI + TTS attribution. */
export function normaliseResult(r) {
  return {
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    score: typeof r.score === 'number' ? Number(r.score.toFixed(3)) : undefined,
    publishedDate: r.published_date || r.publishedDate || null,
  }
}

/**
 * @returns {Promise<{query:string,answer?:string,results:object[],source:string,
 *                    retrievedAt:string,requiresCitation:boolean}>}
 */
export async function webSearch({ query, maxResults = 5, searchDepth = 'basic', topic = 'general' }, env = process.env) {
  const key = env.TAVILY_API_KEY
  if (!query || !String(query).trim()) {
    const e = new Error('query_required'); e.statusCode = 400; throw e
  }
  if (!key) {
    const e = new Error('tavily_not_configured'); e.statusCode = 503; throw e
  }
  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: String(query).trim(),
      max_results: Math.min(20, Math.max(1, Number(maxResults) || 5)),
      search_depth: searchDepth,
      topic,
      include_answer: true,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = new Error(body?.error || `tavily_http_${res.status}`)
    e.statusCode = res.status === 401 || res.status === 403 ? 401 : 502
    throw e
  }
  return {
    query: String(query).trim(),
    answer: body.answer || undefined,
    results: Array.isArray(body.results) ? body.results.map(normaliseResult) : [],
    source: 'tavily',
    retrievedAt: new Date().toISOString(),
    // Spoken answers must attribute; the client reads this as "cited, not remembered".
    requiresCitation: true,
  }
}
