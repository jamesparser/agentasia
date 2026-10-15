// Agent loop: Nemotron on Token Factory decides *when* a fact needs the live web,
// Tavily answers it, and the citations come back with the reply. This is what
// makes Tavily part of the solution rather than a plugin: a spoken assistant that
// guesses a price lies out loud, so retrieval has to be in the loop.
//
// cultural_insights is the second retrieval tool: Qloo's taste graph grounds
// recommendations in what people of that culture actually like, so AgentAsia
// does more than translate.
import { webSearch, searchConfigured } from './tools/websearch.mjs'
import {
  culturalInsights,
  compactCultureForModel,
  qlooConfigured,
} from './tools/qloo.mjs'

export const WEB_SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Search the live web. REQUIRED before stating anything time-varying: prices, ' +
      'weather, sports scores, news, schedules, "current/latest" claims. If you are ' +
      'unsure whether a fact still holds, search instead of answering from memory. ' +
      'Never present a search result as your own knowledge; cite the source you used.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query, in the user\'s language when possible.' },
        max_results: { type: 'number', description: 'Results to retrieve, 1-5. Default 3.' },
      },
      required: ['query'],
    },
  },
}

export const CULTURAL_INSIGHTS_TOOL = {
  type: 'function',
  function: {
    name: 'cultural_insights',
    description:
      'Get cultural taste signals from Qloo for a locale and intent (dining, gifts, ' +
      'music, film, travel, shopping, weekend plans). REQUIRED before recommending ' +
      'food, places, gifts, entertainment, or lifestyle ideas so advice matches local ' +
      'culture instead of generic defaults. Pass the user\'s locale when known.',
    parameters: {
      type: 'object',
      properties: {
        locale: {
          type: 'string',
          description: 'BCP-47 / ISO locale such as km, ja, hi, th, id, fil, ko, zh-CN. Defaults to the conversation language.',
        },
        intent: {
          type: 'string',
          enum: [
            'dining', 'food', 'restaurants', 'travel', 'trip', 'weekend', 'places',
            'gifts', 'shopping', 'brands', 'fashion', 'music', 'film', 'movies',
            'tv', 'shows', 'books', 'podcasts', 'games', 'people', 'general',
          ],
          description: 'What kind of cultural taste you need.',
        },
        query: {
          type: 'string',
          description: 'Optional focus, e.g. "weekend in Bangkok for parents" or "gifts for a Japanese colleague".',
        },
        entity_type: {
          type: 'string',
          enum: ['place', 'destination', 'brand', 'artist', 'movie', 'tv_show', 'book', 'podcast', 'video_game', 'person'],
          description: 'Override the entity category. Usually leave unset and let intent decide.',
        },
        limit: { type: 'number', description: 'How many entities to return, 3-10. Default 6.' },
      },
      required: [],
    },
  },
}

const SYSTEM_ADDENDUM =
  'You can call web_search and cultural_insights. Any claim about the present moment (price, weather, score, ' +
  'news, dates) MUST come from a web_search result in this turn, and you must name the ' +
  'source and the date. Any recommendation about food, places, gifts, music, film, or lifestyle ' +
  'should use cultural_insights first so it fits the user\'s culture (Qloo taste graph). ' +
  'If a tool fails or nothing is found, say so plainly rather than guessing.'

const MAX_TOOL_ROUNDS = 3
// Measured on the live API: feeding Tavily's raw payload back for a weather question
// cost 6,194 tokens (~$0.00038) and 3.45s, vs ~849 tokens for a price question.
// The model needs the ANSWER plus a few trimmed snippets to cite - not the whole
// crawl. Compaction is a ~5x cost/latency cut with no loss in citable content.
const RESULTS_TO_MODEL = 3
const SNIPPET_CHARS = 320
const TOOL_MESSAGE_CAP = 3000

/** Slim, model-facing view of a search result. Full citations go to the UI. */
export function compactSearchForModel(out) {
  if (out?.error) return { error: out.error }
  return {
    answer: out.answer || null,
    retrievedAt: out.retrievedAt || null,
    results: (out.results || []).slice(0, RESULTS_TO_MODEL).map((r) => ({
      title: (r.title || '').slice(0, 120),
      url: r.url || '',
      content: (r.content || '').slice(0, SNIPPET_CHARS),
      publishedDate: r.publishedDate || null,
    })),
    instruction: 'Answer in the user\'s language. Cite one source title and the date.',
  }
}

/**
 * @param {object} opts
 * @param {Array} opts.messages        chat history from the client
 * @param {string} opts.model          Token Factory model id
 * @param {(p:object)=>Promise<object>} opts.route  chat completion caller (injected for tests)
 * @param {boolean} [opts.useFallback]
 */
export async function runAgentTurn({
  messages = [], model, route, useFallback = false, env = process.env, search = webSearch,
  /** Tools the user's own MCP server(s) exposed. Passed through verbatim so the
   *  model can call them; execution stays client-side / upstream, never here. */
  userTools = [], onUserToolCall = null,
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    const e = new Error('messages_required'); e.statusCode = 400; throw e
  }
  const canSearch = searchConfigured(env)
  const canCulture = qlooConfigured(env)
  const convo = canSearch || canCulture
    ? [{ role: 'system', content: SYSTEM_ADDENDUM }, ...messages]
    : [...messages]

  // web_search only if Tavily is configured; cultural_insights only if Qloo is
  // configured; user tools only if they brought them.
  const offeredTools = [
    ...(canSearch ? [WEB_SEARCH_TOOL] : []),
    ...(canCulture ? [CULTURAL_INSIGHTS_TOOL] : []),
    ...(Array.isArray(userTools) ? userTools : []),
  ]
  if (!offeredTools.length && !canSearch) { /* plain completion */ }
  const toolLog = []
  const userToolCalls = []
  let result = null

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS
    result = await route({
      model,
      messages: convo,
      // On the final round we forbid tools so the model must answer, not stall.
      ...(offeredTools.length && !isLastRound ? { tools: offeredTools, tool_choice: 'auto' } : {}),
      ...(isLastRound && canSearch ? { tool_choice: 'none' } : {}),
      ...(useFallback ? { fallback: true } : {}),
    })

    const msg = result?.choices?.[0]?.message || {}
    const calls = msg.tool_calls || []
    if (!calls.length) break

    if (isLastRound) { // asked for tools again after being refused
      break
    }

    convo.push({
      role: 'assistant',
      content: msg.content ?? '',
      tool_calls: calls,
    })

    for (const call of calls) {
      const fn = call?.function
      let payload
      try { payload = JSON.parse(fn?.arguments || '{}') } catch { payload = {} }
      let out
      if (fn?.name === 'web_search') {
        try {
          out = await search({ query: payload.query || '', maxResults: Math.min(5, Math.max(1, Number(payload.max_results) || 3)) }, env)
        } catch (error) {
          out = { error: error.message || 'search_failed' }
        }
      } else if (fn?.name === 'cultural_insights') {
        try {
          out = await culturalInsights({
            locale: payload.locale || payload.culture || 'en',
            intent: payload.intent || 'general',
            entityType: payload.entity_type || payload.entityType,
            query: payload.query,
            limit: Math.min(10, Math.max(3, Number(payload.limit) || 6)),
          }, env)
        } catch (error) {
          out = { error: error.message || 'culture_failed', success: false }
        }
      } else {
        // A tool that belongs to the user's own connector. We do not execute it and
        // never see their credentials: hand it back to the caller (browser-side MCP
        // client) and record that the model asked.
        out = { pending_user_tool: true, name: fn?.name || 'unnamed', arguments: payload }
        userToolCalls.push({ callId: call.id, name: fn?.name || 'unnamed', arguments: payload })
        onUserToolCall?.({ name: fn?.name, arguments: payload, callId: call.id })
      }
      const isCulture = fn?.name === 'cultural_insights'
      const hits = isCulture
        ? (Array.isArray(out.entities) ? out.entities.length : 0)
        : (Array.isArray(out.results) ? out.results.length : 0)
      toolLog.push({
        callId: call.id,
        query: payload.query || payload.intent || '',
        tool: fn?.name || 'web_search',
        ok: !out.error,
        error: out.error || null,
        hits,
        userTool: !!out.pending_user_tool,
        answer: out.answer || null,
        sources: isCulture
          ? (out.entities || []).slice(0, 5).map((e) => ({
              title: e.name || 'cultural pick',
              url: e.properties?.website || (e.id ? `https://qloo.com` : ''),
              publishedDate: null,
            }))
          : (out.results || []).slice(0, 5).map((r) => ({
              title: r.title, url: r.url, publishedDate: r.publishedDate || null,
            })),
        retrievedAt: out.retrievedAt || null,
      })
      const modelView = isCulture ? compactCultureForModel(out) : compactSearchForModel(out)
      convo.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(modelView).slice(0, TOOL_MESSAGE_CAP),
      })
    }
  }

  const message = result?.choices?.[0]?.message || {}
  const searched = toolLog.filter((t) => t.ok && t.hits > 0)
  return {
    result,
    message: { role: 'assistant', content: message.content ?? '', refusal: message.refusal ?? null },
    finishReason: result?.choices?.[0]?.finish_reason ?? null,
    usage: result?.usage || null,
    toolRounds: toolLog.length,
    // UI contract: render these as a citation card and read them aloud as
    // "per <source>, <date>" - the reason the naga can be trusted with numbers.
    citations: searched.flatMap((t) => t.sources.map((s) => ({ ...s, query: t.query, retrievedAt: t.retrievedAt }))),
    searchTrace: toolLog.map(({ query, ok, error, hits, userTool, tool }) => ({ query, ok, error, hits, userTool: !!userTool, tool })),
    searchAvailable: canSearch,
    cultureAvailable: canCulture,
    // Client executes these against ITS OWN MCP connection and may send a second
    // turn with the results; the gateway remains stateless about user data.
    userToolCalls,
  }
}
