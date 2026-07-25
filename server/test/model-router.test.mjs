import assert from 'node:assert/strict'
import { configuredProviders, routeChat } from '../src/model-router.mjs'

assert.deepEqual(configuredProviders({ DEEPSEEK_API_KEY: 'test' }), ['deepseek'])
await assert.rejects(
  () => routeChat({ provider: 'unknown', model: 'x', messages: [{}] }, {}),
  /unsupported_provider/,
)
await assert.rejects(
  () => routeChat({ provider: 'deepseek', model: 'x', messages: [] }, {}),
  /provider_not_configured/,
)
console.log('model-router tests passed')
