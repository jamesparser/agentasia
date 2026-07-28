import assert from 'node:assert/strict'
import {
  configuredProviders,
  providerCatalog,
  routeChat,
  registerProvider,
  unregisterProvider,
  listDynamicProviders,
  getAllProviders,
} from '../src/model-router.mjs'
import { PROVIDERS } from '../src/model-router.mjs'

// ── No naga1 aliases anywhere ──────────────────────────────────
for (const [id, config] of Object.entries(PROVIDERS)) {
  if (config.aliases) {
    for (const alias of Object.keys(config.aliases)) {
      assert.ok(!alias.startsWith('naga1'),
        `${id} should not have naga1 alias: ${alias}`)
    }
  }
}
// meshllm still has aliases: {} (empty, no naga1)
assert.deepEqual(PROVIDERS.meshllm.aliases, {})
assert.deepEqual(PROVIDERS.petals.aliases, {})

// ── Provider detection ─────────────────────────────────────────
const envWithDeepSeek = { DEEPSEEK_API_KEY: 'sk-test' }
assert.ok(configuredProviders(envWithDeepSeek).includes('deepseek'))

const envEmpty = {}
const providers = configuredProviders(envEmpty)
// All local providers are always configured
assert.ok(providers.includes('meshllm'))
assert.ok(providers.includes('petals'))
assert.ok(providers.includes('mlx-gemma'))
assert.ok(providers.includes('litellm-freemium'))
assert.ok(providers.includes('litellm-agent'))
assert.ok(providers.includes('litellm-fable'))
assert.ok(providers.includes('lilypad'))
assert.ok(providers.includes('deeperseeker'))
assert.ok(providers.includes('deepseek-reverse'))
// openai-compatible is alwaysConfigured — shows regardless of env
assert.ok(providers.includes('openai-compatible'))
// Cloud providers without keys do NOT show
assert.ok(!providers.includes('deepseek'))

// ── Provider catalog ──────────────────────────────────────────
const catalog = providerCatalog(envEmpty)
assert.equal(catalog.deepseek.name, 'DeepSeek')
assert.equal(catalog['mlx-gemma'].name, 'MLX Gemma 4 (Local)')
assert.equal(catalog['openai-compatible'].name, 'OpenAI Compatible')
assert.equal(catalog['openai-compatible'].configured, true,
  'openai-compatible should always be configured')
assert.equal(catalog.deepseek.configured, false,
  'deepseek should NOT be configured without key')

// ── openai-compatible: accepts baseUrl + apiKey per request ────
// Should throw "no_base_url" if nothing provided
await assert.rejects(
  () => routeChat({
    provider: 'openai-compatible',
    model: 'test-model',
    messages: [{ role: 'user', content: 'hi' }],
  }, envEmpty),
  /no_base_url/,
)

// Should throw "no_model" if baseUrl provided but no model
await assert.rejects(
  () => routeChat({
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:8080/v1',
    messages: [{ role: 'user', content: 'hi' }],
  }, envEmpty),
  /no_model/,
)

// ── Dynamic provider registry ──────────────────────────────────
const agnesProvider = registerProvider('my-custom-llm', {
  name: 'My Custom LLM',
  baseUrl: 'http://localhost:9090/v1',
  defaultModel: 'llama-3',
  models: ['llama-3', 'llama-2'],
  description: 'My own model server',
})

assert.equal(agnesProvider.name, 'My Custom LLM')
assert.equal(agnesProvider.dynamic, true)
assert.equal(agnesProvider.alwaysConfigured, true)
assert.ok(configuredProviders().includes('my-custom-llm'))

// Dynamic providers also accept per-request baseUrl/apiKey
assert.ok(getAllProviders()['my-custom-llm'])

// Cannot register with reserved ID
assert.throws(() => registerProvider('deepseek', { name: 'x', baseUrl: 'http://x' }),
  /provider_id_reserved/)

// Unregister
const removed = unregisterProvider('my-custom-llm')
assert.equal(removed.removed, 'my-custom-llm')
assert.throws(() => unregisterProvider('my-custom-llm'), /provider_not_found/)

// ── Error: unsupported provider ────────────────────────────────
await assert.rejects(
  () => routeChat({ provider: 'nonexistent', model: 'x', messages: [{ role: 'user', content: 'hi' }] }, envWithDeepSeek),
  /unsupported_provider/,
)

// ── Error: provider not configured (no key) ────────────────────
await assert.rejects(
  () => routeChat({ provider: 'deepseek', model: 'deepseek-chat', messages: [{ role: 'user', content: 'hi' }] }, envEmpty),
  /provider_not_configured/,
)

// ── Error: empty messages ──────────────────────────────────────
await assert.rejects(
  () => routeChat({ provider: 'deepseek', model: 'deepseek-chat', messages: [] }, envWithDeepSeek),
  /messages_required/,
)

// ── Default models ─────────────────────────────────────────────
assert.equal(PROVIDERS.deepseek.defaultModel, 'deepseek-chat')
assert.equal(PROVIDERS['asi1-mini'].defaultModel, 'asi1-mini')
assert.equal(PROVIDERS['mlx-gemma'].defaultModel, 'gemma-4')
assert.equal(PROVIDERS['litellm-freemium'].defaultModel, 'gpt-3.5-turbo')
assert.equal(PROVIDERS['litellm-agent'].defaultModel, 'deepseek-chat')
assert.equal(PROVIDERS['litellm-fable'].defaultModel, 'claude-haiku')
assert.equal(PROVIDERS.lilypad.defaultModel, 'lilypad-mcp')
assert.equal(PROVIDERS.lilypad.mcp, true)

// ── openai-compatible has empty defaults (set per-request) ─────
assert.equal(PROVIDERS['openai-compatible'].baseUrl, '')
assert.equal(PROVIDERS['openai-compatible'].defaultModel, '')
assert.equal(PROVIDERS['openai-compatible'].alwaysConfigured, true)

console.log('model-router tests passed (22 providers, no naga1, openai-compatible per-request)')
