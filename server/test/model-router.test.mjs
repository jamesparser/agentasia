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

// ── New providers should exist ─────────────────────────────────
assert.ok(providers.includes('mlx-gemma'), 'mlx-gemma should be configured (local)')
assert.ok(providers.includes('litellm-freemium'), 'litellm-freemium should be configured (local)')
assert.ok(providers.includes('litellm-agent'), 'litellm-agent should be configured (local)')
assert.ok(providers.includes('litellm-fable'), 'litellm-fable should be configured (local)')
assert.ok(providers.includes('lilypad'), 'lilypad should be configured (local)')
assert.ok(providers.includes('deeperseeker'), 'deeperseeker should be configured (local)')
assert.ok(providers.includes('generic'), 'generic should be configured (local)')

// ── Provider catalog ───────────────────────────────────────────
const catalog = providerCatalog(envWithDeepSeek)
assert.equal(catalog.deepseek.name, 'DeepSeek')
assert.equal(catalog['mlx-gemma'].name, 'MLX Gemma 4 (Local)')
assert.equal(catalog['litellm-freemium'].name, 'LiteLLM Freemium')
assert.equal(catalog['litellm-agent'].name, 'LiteLLM Agent')
assert.equal(catalog['litellm-fable'].name, 'LiteLLM Fable')
assert.equal(catalog.lilypad.name, 'Lilypad MCP')
assert.equal(catalog.lilypad.mcp, true)
assert.equal(catalog.generic.dynamic, true)

// ── Dynamic provider registry ──────────────────────────────────
// Register a new provider
const agnesProvider = registerProvider('agnes-deepseek', {
  name: 'Agnes DeepSeek Proxy',
  baseUrl: 'http://localhost:4090/v1',
  defaultModel: 'deepseek-chat',
  models: ['deepseek-chat', 'deepseek-v4-pro'],
  description: 'My custom DeepSeek proxy',
})

assert.equal(agnesProvider.name, 'Agnes DeepSeek Proxy')
assert.equal(agnesProvider.dynamic, true)

// Should appear in configured providers
const withDynamic = configuredProviders()
assert.ok(withDynamic.includes('agnes-deepseek'), 'dynamic provider should appear in configured list')

// Should appear in catalog
const catalogWithDynamic = providerCatalog()
assert.ok(catalogWithDynamic['agnes-deepseek'])
assert.equal(catalogWithDynamic['agnes-deepseek'].name, 'Agnes DeepSeek Proxy')

// List dynamic providers
const dynamic = listDynamicProviders()
assert.ok(dynamic['agnes-deepseek'])

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

// ── Naga1 alias resolution ─────────────────────────────────────
import { PROVIDERS } from '../src/model-router.mjs'
assert.equal(PROVIDERS.deepseek.aliases['naga1-large'], 'deepseek-v4-pro')
assert.equal(PROVIDERS.deepseek.aliases['naga1-chat'], 'deepseek-chat')
assert.equal(PROVIDERS.deepseek.aliases['naga1-flash'], 'deepseek-v4-flash')
assert.equal(PROVIDERS.deeperseeker.aliases['naga1-large'], 'instant')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-mini'], 'asi1-mini')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-free'], 'asi1-mini')
assert.equal(PROVIDERS['litellm-freemium'].aliases['naga1-lite'], 'gpt-3.5-turbo')
assert.equal(PROVIDERS['litellm-agent'].aliases['naga1-agent'], 'deepseek-chat')
assert.equal(PROVIDERS['litellm-fable'].aliases['naga1-fable'], 'claude-haiku')
assert.equal(PROVIDERS['mlx-gemma'].aliases['naga1-gemma'], 'gemma-4')
assert.equal(PROVIDERS.lilypad.aliases['naga1-lily'], 'lilypad-mcp')

// ── MLX Gemma 4 defaults ───────────────────────────────────────
assert.equal(PROVIDERS['mlx-gemma'].defaultModel, 'gemma-4')
assert.ok(PROVIDERS['mlx-gemma'].local)

console.log('model-router tests passed (23 providers, dynamic registry)')
