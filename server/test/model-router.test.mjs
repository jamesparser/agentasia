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

// ── Provider detection ─────────────────────────────────────────
const envWithDeepSeek = { DEEPSEEK_API_KEY: 'sk-test' }
assert.ok(configuredProviders(envWithDeepSeek).includes('deepseek'))

const envEmpty = {}
const providers = configuredProviders(envEmpty)
assert.ok(providers.includes('meshllm'), 'meshllm should always be configured')
assert.ok(providers.includes('petals'), 'petals should always be configured')
assert.ok(!providers.includes('deepseek'), 'deepseek should not show without key')

// ── New local providers should exist ──────────────────────────
assert.ok(providers.includes('mlx-gemma'), 'mlx-gemma (local)')
assert.ok(providers.includes('litellm-freemium'), 'litellm-freemium (local)')
assert.ok(providers.includes('litellm-agent'), 'litellm-agent (local)')
assert.ok(providers.includes('litellm-fable'), 'litellm-fable (local)')
assert.ok(providers.includes('lilypad'), 'lilypad (local, mcp)')

// ── OpenAI Compatible: NOT configured without URL ─────────────
assert.ok(!providers.includes('openai-compatible'),
  'openai-compatible should NOT show without OPENAI_COMPATIBLE_URL')

const envWithCompatUrl = { OPENAI_COMPATIBLE_URL: 'http://localhost:8080/v1' }
assert.ok(configuredProviders(envWithCompatUrl).includes('openai-compatible'),
  'openai-compatible should show when URL is set')

// ── Provider catalog names ────────────────────────────────────
const catalog = providerCatalog(envWithDeepSeek)
assert.equal(catalog.deepseek.name, 'DeepSeek')
assert.equal(catalog['mlx-gemma'].name, 'MLX Gemma 4 (Local)')
assert.equal(catalog['litellm-freemium'].name, 'LiteLLM Freemium')
assert.equal(catalog.lilypad.name, 'Lilypad MCP')
assert.equal(catalog.lilypad.mcp, true)

// openai-compatible not configured without URL
assert.equal(catalog['openai-compatible'].configured, false)
// openai-compatible IS configured with URL
const catalogWithUrl = providerCatalog(envWithCompatUrl)
assert.equal(catalogWithUrl['openai-compatible'].configured, true)

// ── Dynamic provider registry ──────────────────────────────────
const agnesProvider = registerProvider('agnes-deepseek', {
  name: 'Agnes DeepSeek Proxy',
  baseUrl: 'http://localhost:4090/v1',
  defaultModel: 'deepseek-chat',
  models: ['deepseek-chat', 'deepseek-v4-pro'],
  description: 'My custom DeepSeek proxy',
})

assert.equal(agnesProvider.name, 'Agnes DeepSeek Proxy')
assert.equal(agnesProvider.dynamic, true)
assert.ok(configuredProviders().includes('agnes-deepseek'))

// Cannot register with reserved ID
assert.throws(() => registerProvider('deepseek', { name: 'x', baseUrl: 'http://x' }), /provider_id_reserved/)

// Unregister
const removed = unregisterProvider('agnes-deepseek')
assert.equal(removed.removed, 'agnes-deepseek')
assert.throws(() => unregisterProvider('agnes-deepseek'), /provider_not_found/)

// getAllProviders merges built-in + dynamic
registerProvider('temp-provider', { name: 'Temp', baseUrl: 'http://localhost/v1', models: ['test'] })
assert.ok(getAllProviders()['temp-provider'])
assert.ok(getAllProviders().deepseek) // built-in still there
unregisterProvider('temp-provider')

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

// ── Naga1 alias resolution (production providers only) ─────────
import { PROVIDERS } from '../src/model-router.mjs'
assert.equal(PROVIDERS.deepseek.aliases['naga1-large'], 'deepseek-v4-pro')
assert.equal(PROVIDERS.deepseek.aliases['naga1-chat'], 'deepseek-chat')
assert.equal(PROVIDERS.deepseek.aliases['naga1-flash'], 'deepseek-v4-flash')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-mini'], 'asi1-mini')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-free'], 'asi1-mini')
assert.equal(PROVIDERS.openrouter.aliases['naga1-router'], 'deepseek/deepseek-chat')
assert.equal(PROVIDERS.venice.aliases['naga1-venice'], 'deepseek-v4-flash')

// ── New providers have NO naga1 aliases (not tested yet) ───────
assert.equal(PROVIDERS['mlx-gemma'].aliases, undefined,
  'mlx-gemma should have no aliases yet')
assert.equal(PROVIDERS['litellm-freemium'].aliases, undefined,
  'litellm-freemium should have no aliases yet')
assert.equal(PROVIDERS['litellm-agent'].aliases, undefined,
  'litellm-agent should have no aliases yet')
assert.equal(PROVIDERS['litellm-fable'].aliases, undefined,
  'litellm-fable should have no aliases yet')
assert.equal(PROVIDERS.lilypad.aliases, undefined,
  'lilypad should have no aliases yet')
assert.equal(PROVIDERS.deeperseeker.aliases, undefined,
  'deeperseeker should have no aliases yet')
assert.equal(PROVIDERS['deepseek-reverse'].aliases, undefined,
  'deepseek-reverse should have no aliases yet')

// openai-compatible defaults
assert.equal(PROVIDERS['openai-compatible'].keyEnv, 'OPENAI_COMPATIBLE_API_KEY')

console.log('model-router tests passed (22 providers, dynamic registry, openai-compatible)')
