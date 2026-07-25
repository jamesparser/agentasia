import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { configuredProviders, routeChat } from './model-router.mjs'
import { createSchedule, listSchedules, queueScheduleRun, updateSchedule } from './schedules.mjs'
import { listScheduleRuns, startScheduleWorker } from './schedule-worker.mjs'

const port = Number(process.env.PORT || 8787)
const allowedOrigin = process.env.APP_ORIGIN || ''
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
async function readJson(req) { let raw = ''; for await (const c of req) raw += c; if (raw.length > 1_000_000) throw new Error('request_too_large'); return raw ? JSON.parse(raw) : {} }

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID(); const origin = req.headers.origin
  if (allowedOrigin && origin === allowedOrigin) { res.setHeader('access-control-allow-origin', allowedOrigin); res.setHeader('vary', 'Origin') }
  res.setHeader('access-control-allow-headers', 'content-type, authorization'); res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { ok: true, service: 'agentasia-api', requestId })
  if (req.method === 'GET' && url.pathname === '/v1/config') return json(res, 200, { localWebGpuEnabled: true, cloudRoutingEnabled: process.env.MODEL_GATEWAY_ENABLED === 'true', configuredProviders: configuredProviders(), scheduledTasksEnabled: process.env.SCHEDULER_ENABLED === 'true' })
  if (req.method === 'POST' && url.pathname === '/v1/models/chat') {
    if (process.env.MODEL_GATEWAY_ENABLED !== 'true') return json(res, 503, { error: 'model_gateway_disabled', requestId })
    try { return json(res, 200, await routeChat(await readJson(req))) } catch (error) { return json(res, error.statusCode || (error.message === 'unsupported_provider' ? 400 : 502), { error: error.message, requestId }) }
  }
  if (url.pathname === '/v1/schedules') {
    if (process.env.SCHEDULER_ENABLED !== 'true') return json(res, 503, { error: 'scheduler_disabled', requestId })
    try { if (req.method === 'GET') return json(res, 200, await listSchedules()); if (req.method === 'POST') return json(res, 201, await createSchedule(await readJson(req))) } catch (error) { return json(res, 400, { error: error.message, requestId }) }
  }
  if (req.method === 'GET' && url.pathname === '/v1/schedule-runs') {
    if (process.env.SCHEDULER_ENABLED !== 'true') return json(res, 503, { error: 'scheduler_disabled', requestId })
    return json(res, 200, await listScheduleRuns(url.searchParams.get('scheduleId') || undefined))
  }
  const match = url.pathname.match(/^\/v1\/schedules\/([^/]+)(?:\/(run))?$/)
  if (match && process.env.SCHEDULER_ENABLED === 'true') {
    try { if (req.method === 'PATCH') return json(res, 200, await updateSchedule(match[1], await readJson(req))); if (req.method === 'POST' && match[2] === 'run') return json(res, 202, await queueScheduleRun(match[1])) } catch (error) { return json(res, 400, { error: error.message, requestId }) }
  }
  return json(res, 404, { error: 'not_found', requestId })
})
if (process.env.SCHEDULER_ENABLED === 'true') startScheduleWorker()
server.listen(port, '0.0.0.0', () => console.log(`AgentAsia API listening on :${port}`))
