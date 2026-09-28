import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildBody, chatUrl, createSseAccumulator, describeGatewayError, extractExtras,
  isManagedLaneConfigured, modelForPlan,
} from '@/lib/llm/managed-lane'

const env = import.meta.env as Record<string, string>
let saved: Record<string, string | undefined> = {}
beforeEach(() => { saved = { ...env } })
afterEach(() => { for (const k of Object.keys(env)) delete env[k]; Object.assign(env, saved) })

describe('managed lane', () => {
  it('needs no client secret: url comes from config, model from the plan', () => {
    env.VITE_AGENTASIA_GATEWAY_URL = 'https://api.agentasia.dev/'
    expect(isManagedLaneConfigured()).toBe(true)
    expect(chatUrl()).toBe('https://api.agentasia.dev/v1/chat/completions')
    const body = buildBody('free', [{ role: 'user', content: 'hi' }], { maxTokens: 64 })
    expect(body.model).toContain('Nemotron-3-Nano')
    expect(body.max_tokens).toBe(64)
    expect(body.agentic).toBe(true)
    const wire = JSON.stringify(body)
    expect(wire).not.toMatch(/apiKey|api_key|NEBIUS|Bearer/)
  })

  it('escalates the model by plan and never lets the user pick it', () => {
    expect(modelForPlan('free')).toMatch(/Nano-30B/i)
    expect(modelForPlan('pro')).toMatch(/super-120b/i)
    expect(modelForPlan('enterprise')).toMatch(/Ultra-550b/i)
    expect(modelForPlan('nonsense' as 'free')).toMatch(/Nano-30B/i)
  })

  it('disables the agentic loop for streaming (gateway only loops on non-stream)', () => {
    env.VITE_AGENTASIA_GATEWAY_URL = 'https://api.agentasia.dev'
    expect(buildBody('free', [], { stream: true }).agentic).toBe(false)
  })

  it('reads citations and user tool calls off the response', () => {
    const e = extractExtras({ agentasia: { citations: [{ title: 'CoinGecko', url: 'https://x' }], search_trace: [{ query: 'q', ok: true, error: null, hits: 1 }], tool_rounds: 1, search_available: true } })
    expect(e.citations[0].title).toBe('CoinGecko')
    expect(e.toolRounds).toBe(1)
    expect(extractExtras({}).citations).toEqual([])
    expect(extractExtras(null).searchAvailable).toBe(false)
    expect(extractExtras({ agentasia: { user_tool_calls: [{ callId: 'c', name: 'gmail_send', arguments: {} }] } }).userToolCalls).toHaveLength(1)
  })

  it('accumulates streamed deltas and tolerates split frames', () => {
    const acc = createSseAccumulator()
    // split mid-JSON: the partial frame must be held, not guessed at
    expect(acc.push('data: {"choices":[{"delta":{"content":"にちは')).toBe('')
    expect(acc.push('"}}]}\n\ndata: {"choices":[{"delta":{"content":"です"}}]}\n\n')).toBe('にちはです')
    acc.push('data: [DONE]\n\n')
    expect(acc.text).toBe('にちはです')
    // a malformed frame is skipped, not fatal
    expect(acc.push('data: {not json}\n\n')).toBe('にちはです')
  })

  it('maps gateway errors to honest copy', () => {
    expect(describeGatewayError(402, 'budget_exhausted_daily')).toMatch(/midnight UTC/)
    expect(describeGatewayError(402)).toMatch(/upgrade/i)
    expect(describeGatewayError(503)).toMatch(/temporarily unavailable/)
    expect(() => { delete env.VITE_AGENTASIA_GATEWAY_URL; chatUrl('') }).toThrow(/gateway_not_configured/)
  })
})
