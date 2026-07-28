import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { configuredProviders, providerCatalog, routeChat, routeChatWithFallback, healthCheckAll, healthCheck } from './model-router.mjs'
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
  res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS')
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

    // ── Model chat ─────────────────────────────────────────────
    if (req.method === 'POST' && p === '/v1/models/chat') {
      if (process.env.MODEL_GATEWAY_ENABLED !== 'true') {
        return json(res, 503, { error: 'model_gateway_disabled', requestId })
      }
      try {
        const body = await readJson(req)
        const useFallback = body.fallback === true
        const result = useFallback
          ? await routeChatWithFallback(body)
          : await routeChat(body)
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
  console.log(`  Providers:     ${configuredProviders().join(', ') || 'none configured'}`)
})
