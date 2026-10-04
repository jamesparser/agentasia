/**
 * Web search through Tavily, via the AgentAsia gateway.
 *
 * The Tavily key never reaches the browser: this tool calls the gateway's
 * `/v1/search`, which checks the signed-in user's plan and meters a daily search
 * allowance (free plan included). The gateway already runs Tavily for plain
 * non-streaming chat, but the app's agent loop streams, so without this tool the
 * agent could not search the web at all.
 *
 * @module tools/plugins/web-search
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import { gatewayFetch } from '@/lib/auth/gatewayFetch'
import { gatewayBase } from '@/lib/llm/managed-lane'

export interface WebSearchParams {
  query: string
  maxResults?: number
  topic?: 'general' | 'news'
}

export interface WebSearchResponse {
  success: true
  query: string
  answer?: string
  results: { title: string; url: string; content: string; publishedDate?: string | null }[]
  retrievedAt?: string
  source: string
}

export interface WebSearchError {
  success: false
  error: string
  code: 'invalid_query' | 'sign_in_required' | 'limit_reached' | 'not_available' | 'network_error'
}

export const WEB_SEARCH_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: `Search the live web (Tavily) and return titled, linked results. Use this for anything that may have changed recently: news, prices, schedules, versions, people in roles, laws. Cite the URLs you rely on.`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for.' },
        maxResults: { type: 'number', description: 'Results to return, 1 to 10. Default 5.', minimum: 1, maximum: 10 },
        topic: { type: 'string', enum: ['general', 'news'], description: 'Use "news" for recent events.' },
      },
      required: ['query'],
    },
  },
}

async function search(params: WebSearchParams, signal?: AbortSignal): Promise<WebSearchResponse | WebSearchError> {
  const query = (params.query || '').trim()
  if (!query) return { success: false, error: 'A search query is required.', code: 'invalid_query' }
  try {
    const res = await gatewayFetch(`${gatewayBase()}/v1/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, maxResults: Math.min(Math.max(params.maxResults ?? 5, 1), 10), topic: params.topic ?? 'general' }),
      signal,
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) return { success: false, error: 'Sign in to use web search.', code: 'sign_in_required' }
    if (res.status === 429) return { success: false, error: 'The daily web search limit for this plan is used up. It resets tomorrow.', code: 'limit_reached' }
    if (res.status === 503) return { success: false, error: 'Web search is not set up on this deployment.', code: 'not_available' }
    if (!res.ok) return { success: false, error: String(body.error || `Search failed (${res.status})`), code: 'network_error' }
    return { success: true, ...body }
  } catch (e) {
    return { success: false, error: (e as Error).message, code: 'network_error' }
  }
}

export const webSearchPlugin: ToolPlugin<WebSearchParams, WebSearchResponse | WebSearchError> = createToolPlugin({
  metadata: {
    name: 'web_search',
    displayName: 'Web Search',
    shortDescription: 'Search the live web with Tavily',
    icon: 'Globe',
    category: 'research',
    tags: ['web', 'search', 'tavily', 'news', 'research'],
    enabledByDefault: true,
    estimatedDuration: 3000,
    requiresConfirmation: false,
  },
  definition: WEB_SEARCH_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) throw new Error('Aborted')
    return search(args, context.abortSignal)
  },
  validate: (args): WebSearchParams => {
    const p = args as WebSearchParams
    if (typeof p.query !== 'string' || !p.query.trim()) throw new Error('Query is required and must be a non-empty string')
    return p
  },
})
