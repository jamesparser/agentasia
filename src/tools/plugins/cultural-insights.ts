/**
 * Cultural insights through Qloo, via the AgentAsia gateway.
 *
 * The Qloo key never reaches the browser. This tool calls the gateway's
 * `/v1/culture`, which maps the user's locale to taste signals and returns
 * what people in that culture actually like. Combined with AgentAsia i18n
 * this is "AI that understands your culture", not just "AI that translates".
 *
 * @module tools/plugins/cultural-insights
 */

import { createToolPlugin } from '../registry'
import type { ToolPlugin } from '../types'
import type { ToolDefinition } from '@/lib/llm/types'
import { gatewayFetch } from '@/lib/auth/gatewayFetch'
import { gatewayBase } from '@/lib/llm/managed-lane'

export type CulturalIntent =
  | 'dining' | 'food' | 'restaurants'
  | 'travel' | 'trip' | 'weekend' | 'places'
  | 'gifts' | 'shopping' | 'brands' | 'fashion'
  | 'music' | 'film' | 'movies' | 'tv' | 'shows'
  | 'books' | 'podcasts' | 'games' | 'people' | 'general'

export interface CulturalInsightsParams {
  locale?: string
  intent?: CulturalIntent
  query?: string
  entity_type?: string
  limit?: number
}

export interface CulturalEntity {
  id: string | null
  name: string | null
  type: string | null
  description?: string
  properties?: {
    address?: string
    country?: string
    city?: string
    image?: string
    website?: string
    business_rating?: number | string
    price_level?: number | string
  }
  popularity?: number
}

export interface CulturalInsightsResponse {
  success: true
  source: 'qloo'
  requiresCitation: true
  retrievedAt: string
  locale: string
  culture: string
  region: string
  intent: string
  entityType: string
  profile: {
    cityHints: string[]
    dining: string[]
    music: string[]
    film: string[]
    lifestyle: string[]
    giftIdeas: string[]
    audiences: string[]
  }
  signals: { tags: string[]; entities: string[] }
  entities: CulturalEntity[]
  note: string
}

export interface CulturalInsightsError {
  success: false
  error: string
  code: 'invalid_params' | 'sign_in_required' | 'limit_reached' | 'not_available' | 'network_error' | 'no_signals'
}

export const CULTURAL_INSIGHTS_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'cultural_insights',
    description:
      'Get cultural taste signals from Qloo for a locale and intent (dining, gifts, music, film, travel, shopping, weekend plans). ' +
      'Use this before recommending food, places, gifts, entertainment, or lifestyle ideas so advice matches the user\'s culture. ' +
      'Pass the user\'s locale (km, ja, hi, th, id, fil, ko, zh-CN, ...) when known. This is what makes AgentAsia culturally grounded.',
    parameters: {
      type: 'object',
      properties: {
        locale: {
          type: 'string',
          description: 'Language / culture locale such as km, ja, hi, th, id, fil, ko, zh-CN.',
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
          description: 'Override the entity category. Usually leave unset.',
        },
        limit: { type: 'number', description: 'How many entities to return, 3-10. Default 6.', minimum: 3, maximum: 10 },
      },
      required: [],
    },
  },
}

async function insights(
  params: CulturalInsightsParams,
  signal?: AbortSignal,
): Promise<CulturalInsightsResponse | CulturalInsightsError> {
  try {
    const res = await gatewayFetch(`${gatewayBase()}/v1/culture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        locale: params.locale || 'en',
        intent: params.intent || 'general',
        query: params.query,
        entity_type: params.entity_type,
        limit: Math.min(Math.max(params.limit ?? 6, 3), 10),
      }),
      signal,
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 401) return { success: false, error: 'Sign in to use cultural insights.', code: 'sign_in_required' }
    if (res.status === 429) return { success: false, error: 'The daily cultural insights limit for this plan is used up. It resets tomorrow.', code: 'limit_reached' }
    if (res.status === 503) return { success: false, error: 'Cultural insights (Qloo) are not set up on this deployment.', code: 'not_available' }
    if (!res.ok) return { success: false, error: String(body.error || `Culture lookup failed (${res.status})`), code: 'network_error' }
    if (body.success === false) return { success: false, error: body.error || 'No cultural signals found.', code: body.code || 'no_signals' }
    return { success: true, source: 'qloo', requiresCitation: true, ...body }
  } catch (e) {
    return { success: false, error: (e as Error).message, code: 'network_error' }
  }
}

export const culturalInsightsPlugin: ToolPlugin<
  CulturalInsightsParams,
  CulturalInsightsResponse | CulturalInsightsError
> = createToolPlugin({
  metadata: {
    name: 'cultural_insights',
    displayName: 'Cultural Insights',
    shortDescription: 'Qloo taste graph for local recommendations',
    icon: 'Globe',
    category: 'research',
    tags: ['culture', 'qloo', 'recommendations', 'locale', 'taste', 'dining', 'travel', 'gifts'],
    enabledByDefault: true,
    estimatedDuration: 4000,
    requiresConfirmation: false,
  },
  definition: CULTURAL_INSIGHTS_TOOL_DEFINITION,
  handler: async (args, context) => {
    if (context.abortSignal?.aborted) throw new Error('Aborted')
    return insights(args, context.abortSignal)
  },
  validate: (args): CulturalInsightsParams => {
    const p = (args || {}) as CulturalInsightsParams
    return {
      locale: typeof p.locale === 'string' && p.locale.trim() ? p.locale.trim() : undefined,
      intent: (p.intent as CulturalIntent) || 'general',
      query: typeof p.query === 'string' && p.query.trim() ? p.query.trim() : undefined,
      entity_type: typeof p.entity_type === 'string' && p.entity_type.trim() ? p.entity_type.trim() : undefined,
      limit: typeof p.limit === 'number' ? p.limit : undefined,
    }
  },
})
