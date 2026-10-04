import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildBody, chatUrl, createSseAccumulator, describeGatewayError, extractExtras,
  canonicalHostedModel, gatewayBase, isManagedLaneConfigured, modelForPlan,
} from '@/lib/llm/managed-lane'
import { AGENTASIA, MANAGED_GATEWAY_DEFAULT } from '@/config/agentasia'

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

  it('repairs the display-name round-trip the gateway cannot resolve', () => {
    // Measured on the deployed build: a fresh visitor sent "NVIDIA-Nemotron-3-Nano-
    // 30B-A3B" (the picker label re-hyphenated, org prefix dropped) and the gateway
    // answered provider_http_404, so the task failed. The canonical id carries the
    // prefix, so both display forms must map back to it.
    const canonical = 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B'
    expect(canonicalHostedModel('NVIDIA-Nemotron-3-Nano-30B-A3B')).toBe(canonical)
    expect(canonicalHostedModel('NVIDIA Nemotron 3 Nano 30B A3B')).toBe(canonical)
    expect(canonicalHostedModel('nvidia nemotron 3 nano 30b a3b')).toBe(canonical)
    expect(canonicalHostedModel(canonical)).toBe(canonical)
    // unknown ids pass through, so a model added to the gateway later still works
    expect(canonicalHostedModel('nvidia/some-new-model')).toBe('nvidia/some-new-model')
    expect(canonicalHostedModel('')).toBe('')
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


  it('defaults to the deployed gateway when the env var is missing', () => {
    // The July production build inlined an EMPTY VITE_AGENTASIA_GATEWAY_URL,
    // which silently disabled the hosted lane while the visibility gate still
    // hid every other provider - an empty model picker in production. The
    // durable hostname is therefore the compiled-in default, overridable per
    // environment, so a missing variable can never strand the app.
    delete env.VITE_AGENTASIA_GATEWAY_URL
    expect(gatewayBase()).toBe(MANAGED_GATEWAY_DEFAULT)
    expect(isManagedLaneConfigured()).toBe(true)
    expect(chatUrl()).toBe(`${MANAGED_GATEWAY_DEFAULT}/v1/chat/completions`)
    env.VITE_AGENTASIA_GATEWAY_URL = 'https://staging.example.com/'
    expect(gatewayBase()).toBe('https://staging.example.com')
  })

  it('keeps the hosted lane selectable when the gate hides bring-your-own-key', () => {
    // The managed gateway speaks the OpenAI wire format, so the hosted lane IS
    // an openai-compatible provider; hiding it left nothing selectable.
    expect(AGENTASIA.ui.hiddenProviders).not.toContain('openai-compatible')
    expect(AGENTASIA.ui.hiddenProviders).toContain('local')
    expect(AGENTASIA.ui.managedGatewayUrl).toBe(MANAGED_GATEWAY_DEFAULT)
  })

  it('maps gateway errors to honest copy', () => {
    expect(describeGatewayError(402, 'budget_exhausted_daily')).toMatch(/midnight UTC/)
    expect(describeGatewayError(402)).toMatch(/upgrade/i)
    expect(describeGatewayError(503)).toMatch(/temporarily unavailable/)
    expect(() => { delete env.VITE_AGENTASIA_GATEWAY_URL; chatUrl('') }).toThrow(/gateway_not_configured/)
  })
})
