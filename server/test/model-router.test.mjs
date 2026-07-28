import assert from 'node:assert/strict'
import { configuredProviders, providerCatalog, routeChat } from '../src/model-router.mjs'

// ── Provider detection ─────────────────────────────────────────
const envWithDeepSeek = { DEEPSEEK_API_KEY: 'sk-test' }
assert.ok(configuredProviders(envWithDeepSeek).includes('deepseek'))

const envEmpty = {}
// meshllm and petals should always show as configured (local providers)
const providers = configuredProviders(envEmpty)
assert.ok(providers.includes('meshllm'), 'meshllm should always be configured')
assert.ok(providers.includes('petals'), 'petals should always be configured')
assert.ok(!providers.includes('deepseek'), 'deepseek should not show without key')

// ── Provider catalog ───────────────────────────────────────────
const catalog = providerCatalog(envWithDeepSeek)
assert.equal(catalog.deepseek.name, 'DeepSeek')
assert.equal(catalog.deepseek.configured, true)
assert.equal(catalog.meshllm.local, true)

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

// ── Naga1 alias resolution (verifies aliases exist, doesn't call API) ──
// Provider 'deepseek' has aliases: naga1-large → deepseek-v4-pro
// When we call routeChat, it should use the resolved model in the request body
// We can verify by checking the provider config directly
import { PROVIDERS } from '../src/model-router.mjs'
assert.equal(PROVIDERS.deepseek.aliases['naga1-large'], 'deepseek-v4-pro')
assert.equal(PROVIDERS.deepseek.aliases['naga1-chat'], 'deepseek-chat')
assert.equal(PROVIDERS.deepseek.aliases['naga1-flash'], 'deepseek-v4-flash')
assert.equal(PROVIDERS.openrouter.aliases['naga1-router'], 'deepseek/deepseek-chat')
assert.equal(PROVIDERS.venice.aliases['naga1-venice'], 'deepseek-v4-flash')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-mini'], 'asi1-mini')
assert.equal(PROVIDERS['asi1-mini'].aliases['naga1-free'], 'asi1-mini')

// ── Local provider should be in catalog even without key ───────
assert.equal(catalog.meshllm.local, true)
assert.equal(catalog.meshllm.configured, true)

console.log('model-router tests passed')
