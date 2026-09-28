import http from 'node:http'
import { randomUUID } from 'node:crypto'
import {
  configuredProviders,
  providerCatalog,
  routeGatewayChat, routeChat,
  routeChatWithFallback,
  healthCheckAll,
  healthCheck,
  registerProvider,
  unregisterProvider,
  listDynamicProviders,
} from './model-router.mjs'
import { webSearch, searchConfigured } from './tools/websearch.mjs'
import { assertWithinBudget, recordSpend, spendSummary } from './spend-guard.mjs'
import { runAgentTurn } from './agent-loop.mjs'
import { resolveGatewayTarget, getAllProviders } from './model-router.mjs'
import { addMemory, searchMemory, deleteAllMemory, memoryPolicy } from './memory.mjs'
import { createSchedule, listSchedules, queueScheduleRun, updateSchedule } from './schedules.mjs'
import { listScheduleRuns, startScheduleWorker } from './schedule-worker.mjs'

const port = Number(process.env.PORT || 8787)
const allowedOrigin = process.env.APP_ORIGIN || '*'

// ── Helpers ────────────────────────────────────────────────────
function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}
function corsHeaders(res, origin) {
  if (allowedOrigin === '*') {
    res.setHeader('access-control-allow-origin', '*')
  } else if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('access-control-allow-origin', allowedOrigin)
    res.setHeader('vary', 'Origin')
  }
  res.setHeader('access-control-allow-headers', 'content-type, authorization')
  res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS')
}
async function readJson(req) {
  let raw = ''
  for await (const c of req) raw += c
  if (raw.length > 1_000_000) throw new Error('request_too_large')
  return raw ? JSON.parse(raw) : {}
}

// ── Server ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const requestId = randomUUID()
  const origin = req.headers.origin
  corsHeaders(res, origin)
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const p = url.pathname

  try {
    // ── Health ─────────────────────────────────────────────────
    if (req.method === 'GET' && p === '/healthz') {
      return json(res, 200, {
        ok: true,
        service: 'agentasia-api',
        uptime: process.uptime(),
        requestId,
      })
    }

    // ── Config / provider catalog ──────────────────────────────
    if (req.method === 'GET' && p === '/v1/config') {
      return json(res, 200, {
        localWebGpuEnabled: true,
        cloudRoutingEnabled: process.env.MODEL_GATEWAY_ENABLED === 'true',
        configuredProviders: configuredProviders(),
        providerCatalog: providerCatalog(),
        scheduledTasksEnabled: process.env.SCHEDULER_ENABLED === 'true',
        requestId,
      })
    }

    // ── Dynamic provider management (the "Agnes" layer) ────────
    if (req.method === 'GET' && p === '/v1/providers/dynamic') {
      return json(res, 200, { providers: listDynamicProviders(), requestId })
    }

    if (req.method === 'POST' && p === '/v1/providers') {
      try {
        const body = await readJson(req)
        if (!body.id || !body.name || !body.baseUrl) {
          return json(res, 400, { error: 'id, name, and baseUrl are required', requestId })
        }
        const provider = registerProvider(body.id, body)
        return json(res, 201, { provider, requestId })
      } catch (error) {
        return json(res, 409, { error: error.message, requestId })
      }
    }

    // Match /v1/providers/:id
    const provMatch = p.match(/^\/v1\/providers\/([^/]+)$/)
    if (provMatch && p !== '/v1/providers/health' && p !== '/v1/providers/dynamic') {
      const providerId = provMatch[1]
      if (req.method === 'DELETE') {
        try {
          return json(res, 200, { ...unregisterProvider(providerId), requestId })
        } catch (error) {
          return json(res, 404, { error: error.message, requestId })
        }
      }
    }

    // ── Provider health ────────────────────────────────────────
    if (req.method === 'GET' && p === '/v1/providers/health') {
      const results = await healthCheckAll()
      return json(res, 200, { providers: results, requestId })
    }

    if (req.method === 'GET' && p.startsWith('/v1/providers/') && p.endsWith('/health')) {
      const providerId = p.split('/')[3]
      const result = await healthCheck(providerId)
      return json(res, result.healthy ? 200 : 503, { ...result, requestId })
    }

    // ── OpenAI-compatible chat (browser clients point here; Nebius-first) ─
    if (req.method === 'POST' && p === '/v1/chat/completions') {
      if (process.env.MODEL_GATEWAY_ENABLED !== 'true') {
        return json(res, 503, { error: 'model_gateway_disabled', requestId })
      }
      try {
        const body = await readJson(req)

        // Spend circuit-breaker: check BEFORE contacting Nebius, so an exhausted
        // budget never reaches the provider and never triggers card charging.
        try {
          await assertWithinBudget()
        } catch (budgetError) {
          if (budgetError.budget) {
            return json(res, 402, {
              error: budgetError.message,
              hint: 'gateway spend cap reached; provider was not contacted',
              requestId,
            })
          }
          throw budgetError
        }

        // Default model resolution mirrors routeGatewayChat so headers/ledger agree.
        const defaultModelFor = (b) => getAllProviders()[resolveGatewayTarget({ ...b, messages: [{ role: 'user', content: '.' }] }, process.env).provider]?.defaultModel || ''

        // Agentic path: Nemotron decides when a fact needs the live web, Tavily
        // answers, citations come back with the reply. Falls back to a plain
        // completion when no Tavily key is configured.
        const useAgent = searchConfigured(process.env) && body.agentic !== false && body.stream !== true
        let provider, model, result, agentMeta = null
        if (useAgent) {
          const turn = await runAgentTurn({
            messages: body.messages,
            model: body.model,
            useFallback: body.fallback === true,
            route: async (params) => (await routeGatewayChat({ ...body, ...params })).result,
          })
          result = turn.result
          model = result?._model || body.model || defaultModelFor(body)
          provider = result?._provider || resolveGatewayTarget({ ...body }, process.env).provider
          agentMeta = {
            citations: turn.citations,
            search_trace: turn.searchTrace,
            tool_rounds: turn.toolRounds,
            search_available: turn.searchAvailable,
          }
        } else {
          const routed = await routeGatewayChat(body)
          provider = routed.provider
          model = routed.model
          result = routed.result
        }

        // Streaming: pass the upstream SSE body straight through.
        if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') {
          corsHeaders(res, origin)   // sets CORS via res.setHeader (returns nothing)
          res.writeHead(200, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            'x-agentasia-provider': provider,
            'x-agentasia-model': model || '',
            'x-request-id': requestId,
          })
          // Ledger for streams: capture usage if the provider emits it, and bound
          // the worst case by the requested max_tokens so a cap can't be evaded
          // by choosing streaming.
          let tail = ''
          let usage = null
          for await (const chunk of result.stream) {
            const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
            res.write(chunk)
            tail = (tail + text).slice(-4000)
            const u = tail.lastIndexOf('"usage":')
            if (u >= 0) {
              try { usage = JSON.parse(tail.slice(u + 8).match(/^[\s\S]*?\}/)?.[0] || 'null') } catch {}
            }
          }
          res.end()
          const bounded = usage || {
            prompt_tokens: 0,
            completion_tokens: Number(body.max_tokens || body.maxTokens || 0),
          }
          await recordSpend(model || body.model || '', bounded)  // model is now always resolved upstream
          return
        }

        res.setHeader('x-agentasia-provider', provider || result?._provider || '')
        if (model) res.setHeader('x-agentasia-model', model)
        await recordSpend(model || result?._model || body.model || '', result?.usage || {})
        return json(res, 200, agentMeta ? { ...result, agentasia: agentMeta } : result)
      } catch (error) {
        const status = error.statusCode || (error.message === 'unsupported_provider' ? 400 : 502)
        return json(res, status, {
          error: { message: error.message, type: 'agentasia_gateway_error', provider_errors: error.errors },
          requestId,
        })
      }
    }

    // ── Model chat ─────────────────────────────────────────────
    if (req.method === 'POST' && p === '/v1/models/chat') {
      if (process.env.MODEL_GATEWAY_ENABLED !== 'true') {
        return json(res, 503, { error: 'model_gateway_disabled', requestId })
      }
      try {
        const body = await readJson(req)
        // Same spend breaker as /v1/chat/completions — every billable path is guarded.
        try {
          await assertWithinBudget()
        } catch (budgetError) {
          if (budgetError.budget) return json(res, 402, { error: budgetError.message, requestId })
          throw budgetError
        }
        const useFallback = body.fallback === true
        const result = useFallback
          ? await routeChatWithFallback(body)
          : await routeChat(body)
        await recordSpend(result?._model || body.model || '', result?.usage || {})
        return json(res, 200, result)
      } catch (error) {
        const status = error.statusCode || (error.message === 'unsupported_provider' ? 400 : 502)
        return json(res, status, {
          error: error.message,
          errors: error.errors,
          requestId,
        })
      }
    }

    // ── Tavily web search (spoken facts must be cited, not remembered) ─
    if (req.method === 'POST' && p === '/v1/search') {
      if (!searchConfigured(process.env)) {
        return json(res, 503, { error: 'tavily_not_configured', requestId })
      }
      try {
        const body = await readJson(req)
        return json(res, 200, await webSearch(body))
      } catch (error) {
        return json(res, error.statusCode || 502, { error: error.message, requestId })
      }
    }

    // ── Memory (Crest Gem) — per-uid, exportable, erasable ────────────
    if (req.method === 'GET' && p === '/v1/memory/policy') {
      return json(res, 200, { ...memoryPolicy, requestId })
    }
    if (p === '/v1/memory') {
      try {
        const body = await readJson(req)
        if (req.method === 'POST') return json(res, 201, await addMemory(body))
        if (req.method === 'DELETE') return json(res, 200, await deleteAllMemory(body))
        return json(res, 405, { error: 'method_not_allowed', requestId })
      } catch (error) {
        return json(res, error.statusCode || 503, { error: error.message, hint: error.hint, requestId })
      }
    }
    if (req.method === 'POST' && p === '/v1/memory/search') {
      try {
        return json(res, 200, await searchMemory(await readJson(req)))
      } catch (error) {
        return json(res, error.statusCode || 503, { error: error.message, hint: error.hint, requestId })
      }
    }

    // ── Spend status (caps, spend to date, ledger health) ─────────
    if (req.method === 'GET' && p === '/v1/spend') {
      return json(res, 200, { ...(await spendSummary()), requestId })
    }

    // ── Schedules ──────────────────────────────────────────────
    if (p === '/v1/schedules') {
      if (process.env.SCHEDULER_ENABLED !== 'true') {
        return json(res, 503, { error: 'scheduler_disabled', requestId })
      }
      if (req.method === 'GET') return json(res, 200, await listSchedules())
      if (req.method === 'POST') return json(res, 201, await createSchedule(await readJson(req)))
    }

    if (req.method === 'GET' && p === '/v1/schedule-runs') {
      if (process.env.SCHEDULER_ENABLED !== 'true') {
        return json(res, 503, { error: 'scheduler_disabled', requestId })
      }
      return json(res, 200, await listScheduleRuns(url.searchParams.get('scheduleId') || undefined))
    }

    const schedMatch = p.match(/^\/v1\/schedules\/([^/]+)(?:\/(run))?$/)
    if (schedMatch && process.env.SCHEDULER_ENABLED === 'true') {
      if (req.method === 'PATCH') {
        return json(res, 200, await updateSchedule(schedMatch[1], await readJson(req)))
      }
      if (req.method === 'POST' && schedMatch[2] === 'run') {
        return json(res, 202, await queueScheduleRun(schedMatch[1]))
      }
    }

    // 404
    return json(res, 404, { error: 'not_found', requestId })
  } catch (error) {
    console.error(`[${requestId}] Unhandled error:`, error)
    return json(res, 500, { error: 'internal_server_error', requestId })
  }
})

// ── Start ──────────────────────────────────────────────────────
if (process.env.SCHEDULER_ENABLED === 'true') startScheduleWorker()
server.listen(port, '0.0.0.0', () => {
  console.log(`AgentAsia API listening on :${port}`)
  console.log(`  Model Gateway: ${process.env.MODEL_GATEWAY_ENABLED === 'true' ? 'ENABLED' : 'disabled'}`)
  console.log(`  Scheduler:     ${process.env.SCHEDULER_ENABLED === 'true' ? 'ENABLED' : 'disabled'}`)
  console.log(`  Providers:     ${configuredProviders().length} configured (${Object.keys(providerCatalog()).length} total)`)
})
