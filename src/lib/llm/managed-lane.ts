/**
 * The managed lane: how the browser app reaches AgentAsia's gateway.
 *
 * The gateway is OpenAI-compatible (`POST /v1/chat/completions`), so the client
 * needs NO secret — the Nebius key lives server-side only. This module is the
 * single place that knows the URL, the plan->model mapping and the `agentasia`
 * extension fields (citations / search trace) the gateway adds to the response.
 *
 * Kept dependency-free and pure so it is unit-testable and safe for another
 * agent to wire into the model picker / LLMService without re-deriving rules.
 */
import { AGENTASIA, MANAGED_GATEWAY_DEFAULT } from '@/config/agentasia'

export type PlanId = 'free' | 'pro' | 'smallBusiness' | 'enterprise'

export function gatewayBase(): string {
  return ((import.meta.env.VITE_AGENTASIA_GATEWAY_URL as string) || MANAGED_GATEWAY_DEFAULT).replace(/\/+$/, '')
}

export function isManagedLaneConfigured(): boolean {
  return Boolean(gatewayBase())
}

/** Model is a plan decision, never a user choice (free = Nano; paid = larger). */
/**
 * Canonicalise a model name for the hosted gateway.
 *
 * The picker formats ids for display by dropping the org prefix and splitting on
 * `-` ("nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B" -> "NVIDIA Nemotron 3 Nano 30B
 * A3B"), and some selection paths write that label back as the model to use. The
 * gateway resolves upstream by exact id, so a re-hyphenated display name answers
 * `provider_http_404` and the task fails - which is what a fresh visitor hit on
 * the deployed build. Every plan model id is known, so map display forms back to
 * the canonical id before sending; an unknown id is passed through untouched so a
 * model added to the gateway later still works.
 */
export function canonicalHostedModel(model: string): string {
  const ids = Object.values(AGENTASIA.plans)
    .map((p) => (p as { model?: string }).model)
    .filter(Boolean) as string[]
  const key = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "")
  const orgs = new Set(ids.map((id) => key(id.split("/")[0] || "")))
  let probe = key(model.includes("/") ? model.split("/").pop()! : model)
  if (!probe) return model
  // The formatted label keeps the vendor word the id's org prefix carried
  // ("NVIDIA Nemotron 3 Nano 30B A3B" from "nvidia/NVIDIA-Nemotron-..."), so the
  // probe can lead with it once or twice. Drop a leading org word before matching.
  const stripOrg = (v: string) => {
    let out = v
    for (let i = 0; i < 2; i++) {
      const lead = [...orgs].find((o) => o && out.startsWith(o) && out.length > o.length)
      if (!lead) break
      out = out.slice(lead.length)
    }
    return out
  }
  const target = stripOrg(probe)
  const hit = ids.find((id) => {
    const base = key(id.includes("/") ? id.split("/").pop()! : id)
    return base === target || base === probe
  })
  return hit || model
}

export function modelForPlan(plan: PlanId = 'free'): string {
  const entry = (AGENTASIA.plans as Record<string, { model?: string }>)[plan]
  return entry?.model || AGENTASIA.plans.free.model
}

export function chatUrl(base = gatewayBase()): string {
  if (!base) throw new Error('gateway_not_configured')
  return `${base}/v1/chat/completions`
}

export interface ManagedRequest {
  model: string
  messages: unknown[]
  stream?: boolean
  max_tokens?: number
  /** Tools from the user's own aggregator MCP; executed client-side. */
  tools?: unknown[]
  agentic?: boolean
}

export function buildBody(plan: PlanId, messages: unknown[], opts: { stream?: boolean; maxTokens?: number; tools?: unknown[] } = {}): ManagedRequest {
  return {
    model: modelForPlan(plan),
    messages,
    ...(opts.stream ? { stream: true } : {}),
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.tools?.length ? { tools: opts.tools } : {}),
    // Tavily loop is on by default; stream is plain-completion by design (the
    // gateway only runs the tool loop for non-streaming requests).
    agentic: !opts.stream,
  }
}

export interface ManagedExtras {
  citations: Array<{ title: string; url: string; publishedDate?: string | null; query?: string; retrievedAt?: string | null }>
  searchTrace: Array<{ query: string; ok: boolean; error: string | null; hits: number; userTool?: boolean }>
  toolRounds: number
  searchAvailable: boolean
  userToolCalls: Array<{ callId: string; name: string; arguments: unknown }>
}

/** Wire shape of the gateway's extension block. */
interface AgentasiaBlock {
  citations?: ManagedExtras['citations']
  search_trace?: ManagedExtras['searchTrace']
  tool_rounds?: number
  search_available?: boolean
  user_tool_calls?: ManagedExtras['userToolCalls']
}

const EMPTY: ManagedExtras = { citations: [], searchTrace: [], toolRounds: 0, searchAvailable: false, userToolCalls: [] }

/** Read the gateway's `agentasia` block from a parsed JSON response. */
export function extractExtras(json: unknown): ManagedExtras {
  const a = (json as { agentasia?: Partial<AgentasiaBlock> } | null)?.agentasia
  if (!a || typeof a !== 'object') return { ...EMPTY }
  return {
    citations: Array.isArray(a.citations) ? a.citations : [],
    searchTrace: Array.isArray(a.search_trace) ? a.search_trace : [],
    toolRounds: Number(a.tool_rounds) || 0,
    searchAvailable: Boolean(a.search_available),
    // Real bug fixed here: the wire field is snake_case `user_tool_calls`, but this
    // was previously read back as camelCase and so always came out empty.
    userToolCalls: Array.isArray(a.user_tool_calls)
      ? (a.user_tool_calls as ManagedExtras['userToolCalls'])
      : [],
  }
}

/** Incremental SSE reader for streamed completions (choices[0].delta.content). */
export function createSseAccumulator() {
  let buffer = ''
  let text = ''
  return {
    push(chunk: string) {
      buffer += chunk
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const d = JSON.parse(payload)
            const piece = d?.choices?.[0]?.delta?.content
            if (typeof piece === 'string') text += piece
          } catch { /* partial frame: wait for more bytes */ }
        }
      }
      return text
    },
    get text() { return text },
  }
}

/** Map gateway failures to copy the UI can show. */
export function describeGatewayError(status: number, code?: string): string {
  if (status === 402) {
    return code === 'budget_exhausted_daily'
      ? 'Daily usage limit reached — Naga is resting until midnight UTC.'
      : 'Usage limit reached. Try again later or upgrade your plan.'
  }
  if (status === 503) return 'Naga is temporarily unavailable. Please try again.'
  return 'Naga could not reach the model. Check your connection and retry.'
}
