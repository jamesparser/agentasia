import http from 'node:http'
import { randomUUID } from 'node:crypto'

const port = Number(process.env.PORT || 8787)
const allowedOrigin = process.env.APP_ORIGIN || ''

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID()
  const origin = req.headers.origin
  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('access-control-allow-origin', allowedOrigin)
    res.setHeader('vary', 'Origin')
  }
  res.setHeader('access-control-allow-headers', 'content-type, authorization')
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  if (req.method === 'GET' && url.pathname === '/healthz') {
    return json(res, 200, { ok: true, service: 'agentasia-api', requestId })
  }
  if (req.method === 'GET' && url.pathname === '/v1/config') {
    return json(res, 200, {
      localWebGpuEnabled: true,
      cloudRoutingEnabled: Boolean(process.env.MODEL_GATEWAY_ENABLED === 'true'),
      scheduledTasksEnabled: Boolean(process.env.SCHEDULER_ENABLED === 'true'),
    })
  }

  return json(res, 404, { error: 'not_found', requestId })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`AgentAsia API listening on :${port}`)
})
