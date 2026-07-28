// AgentAsia Model Router — multi-provider gateway with fallback, aliasing, and dynamic provider registry
// Phase 1: All provider integrations + Naga model aliases + runtime provider management

const PROVIDERS = {
  // ── Primary managed routes ──────────────────────────────────
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    aliases: {
      'naga1-large': 'deepseek-v4-pro',
      'naga1-pro': 'deepseek-v4-pro',
      'naga1-chat': 'deepseek-chat',
      'naga1-flash': 'deepseek-v4-flash',
    },
    models: ['deepseek-chat', 'deepseek-v4-pro', 'deepseek-v4-flash'],
  },

  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'deepseek/deepseek-chat',
    aliases: {
      'naga1-router': 'deepseek/deepseek-chat',
    },
    models: ['deepseek/deepseek-chat', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro'],
  },

  venice: {
    name: 'Venice AI',
    baseUrl: 'https://api.venice.ai/api/v1',
    keyEnv: 'VENICE_API_KEY',
    defaultModel: 'deepseek-v4-flash',
    aliases: {
      'naga1-venice': 'deepseek-v4-flash',
    },
    models: ['deepseek-v4-flash', 'qwen3-vl-235b-a22b', 'google-gemma-4-31b-it'],
  },

  // ── Free / budget routes ─────────────────────────────────────
  'asi1-mini': {
    name: 'CUDOS ASI Cloud',
    baseUrl: 'https://inference.asicloud.cudos.org/v1',
    keyEnv: 'CUDOS_ASI_KEY',
    defaultModel: 'asi1-mini',
    aliases: {
      'naga1-mini': 'asi1-mini',
      'naga1-free': 'asi1-mini',
    },
    models: ['asi1-mini'],
    free: true,
  },

  asi1: {
    name: 'ASI1',
    baseUrl: 'https://api.asi1.ai/v1',
    keyEnv: 'ASI1_API_KEY',
    defaultModel: 'asi1',
    aliases: {},
    models: ['asi1'],
    free: true,
  },

  // ── Regional / alt routes ────────────────────────────────────
  redpill: {
    name: 'Redpill/Phala',
    baseUrl: 'https://api.redpill.ai/v1',
    keyEnv: 'REDPILL_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    aliases: {},
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-vl-30b-a3b-instruct'],
  },

  zhipu: {
    name: 'Z.AI (Zhipu GLM)',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    keyEnv: 'ZHIPU_API_KEY',
    defaultModel: 'zai/glm-4.7-flash',
    aliases: {},
    models: ['zai/glm-4.7-flash', 'zai/glm-4.6v-flash'],
    free: true,
  },

  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
    aliases: {},
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  },

  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    keyEnv: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-large-latest',
    aliases: {},
    models: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large-latest'],
  },

  agentrouter: {
    name: 'AgentRouter',
    baseUrl: 'https://agentrouter.org/v1',
    keyEnv: 'AGENTROUTER_API_KEY',
    defaultModel: 'deepseek-v3.2',
    aliases: {},
    models: ['deepseek-v3.2', 'claude-haiku-4-5', 'glm-5.1'],
  },

  crowllm: {
    name: 'CrowLLM',
    baseUrl: 'https://crowllm.com/v1',
    keyEnv: 'CROWLLM_API_KEY',
    defaultModel: 'gemma-4-e2b',
    aliases: {},
    models: ['gemma-4-e2b'],
  },

  inception: {
    name: 'Inception Labs',
    baseUrl: 'https://api.inceptionlabs.ai/v1',
    keyEnv: 'INCEPTION_API_KEY',
    defaultModel: 'inception/mercury-2',
    aliases: {},
    models: ['inception/mercury-2'],
  },

  // ── Reverse-engineered DeepSeek proxies (free chat.deepseek.com) ──
  deeperseeker: {
    name: 'DeeperSeeker (DeepSeek Web Proxy)',
    baseUrl: process.env.DEEPERSKER_URL || 'http://localhost:4000',
    keyEnv: 'DEEPERSKER_API_KEY',
    defaultModel: 'instant',
    models: ['instant', 'vision', 'expert'],
    description: 'LiteLLM-based reverse proxy for chat.deepseek.com — free, no API key needed',
    local: true,
  },

  'deepseek-reverse': {
    name: 'DeepSeek Reverse Proxy',
    baseUrl: process.env.DEEPSEEK_REVERSE_URL || 'http://localhost:4010/v1',
    keyEnv: 'DEEPSEEK_REVERSE_KEY',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-v4-pro', 'deepseek-v4-flash'],
    description: 'Reverse-engineered DeepSeek web chat → OpenAI API (needs wrapper server)',
    local: true,
  },

  // ── LiteLLM router tiers (naga-litellm-router fork) ──────────
  'litellm-freemium': {
    name: 'LiteLLM Freemium',
    baseUrl: process.env.LITELLM_FREEMIUM_URL || 'http://localhost:4001',
    keyEnv: 'LITELLM_FREEMIUM_KEY',
    defaultModel: 'gpt-3.5-turbo',
    models: [],
    description: 'LiteLLM router — freemium tier (rate-limited, shared models)',
    local: true,
  },

  'litellm-agent': {
    name: 'LiteLLM Agent',
    baseUrl: process.env.LITELLM_AGENT_URL || 'http://localhost:4002',
    keyEnv: 'LITELLM_AGENT_KEY',
    defaultModel: 'deepseek-chat',
    models: [],
    description: 'LiteLLM router — agent tier (higher limits, function calling)',
    local: true,
  },

  'litellm-fable': {
    name: 'LiteLLM Fable',
    baseUrl: process.env.LITELLM_FABLE_URL || 'http://localhost:4003',
    keyEnv: 'LITELLM_FABLE_KEY',
    defaultModel: 'claude-haiku',
    models: [],
    description: 'LiteLLM router — fable tier (creative/storytelling models)',
    local: true,
  },

  // ── Lily MCP fork (MCP → OpenAI bridge needed) ───────────────
  lilypad: {
    name: 'Lilypad MCP',
    baseUrl: process.env.LILYPAD_MCP_URL || 'http://localhost:4200/v1',
    keyEnv: 'LILYPAD_MCP_KEY',
    defaultModel: 'lilypad-mcp',
    models: ['lilypad-mcp'],
    description: 'Lilypad decentralized GPU MCP — needs MCP-to-OpenAI bridge',
    local: true,
    mcp: true,
  },

  // ── MLX Gemma 4 (local Mac MLX) ──────────────────────────────
  'mlx-gemma': {
    name: 'MLX Gemma 4 (Local)',
    baseUrl: process.env.MLX_GEMMA_URL || 'http://localhost:11434/v1',
    keyEnv: 'MLX_GEMMA_KEY',
    defaultModel: 'gemma-4',
    models: ['gemma-4', 'gemma-4-4b', 'gemma-4-27b'],
    description: 'Google Gemma 4 running on Apple MLX — local Mac inference',
    local: true,
  },

  // ── Local / self-hosted routes ───────────────────────────────
  meshllm: {
    name: 'MeshLLM (Local GPU Mesh)',
    baseUrl: process.env.MESHLLM_URL || 'http://localhost:9337/v1',
    keyEnv: 'MESHLLM_API_KEY',
    defaultModel: process.env.MESHLLM_MODEL || 'naga1-mini',
    aliases: {},
    models: [],
    local: true,
  },

  petals: {
    name: 'Petals Gateway',
    baseUrl: process.env.PETALS_URL || 'http://localhost:8888/v1',
    keyEnv: 'PETALS_API_KEY',
    defaultModel: 'petals-team/stable-beluga',
    aliases: {},
    models: [],
    local: true,
  },

  // ── OpenAI Compatible (user-configurable custom provider) ────
  'openai-compatible': {
    name: 'OpenAI Compatible',
    baseUrl: process.env.OPENAI_COMPATIBLE_URL || '',
    keyEnv: 'OPENAI_COMPATIBLE_API_KEY',
    defaultModel: process.env.OPENAI_COMPATIBLE_MODEL || 'default',
    models: [],
    description: 'Point at any OpenAI-compatible endpoint — set OPENAI_COMPATIBLE_URL + OPENAI_COMPATIBLE_API_KEY + OPENAI_COMPATIBLE_MODEL in .env',
    local: true,
  },
}

// ── Dynamic provider registry (runtime add/remove) ────────────
let dynamicProviders = {}
try {
  // Persisted dynamic providers from disk
  const fs = await import('node:fs')
  const path = await import('node:path')
  const dynamicFile = path.join('/data', 'dynamic-providers.json')
  if (fs.existsSync(dynamicFile)) {
    dynamicProviders = JSON.parse(fs.readFileSync(dynamicFile, 'utf-8'))
  }
} catch {
  // No persistence available (e.g., /data not mounted) — memory-only
}

function saveDynamicProviders() {
  try {
    const fs = require('node:fs')
    fs.mkdirSync('/data', { recursive: true })
    fs.writeFileSync('/data/dynamic-providers.json', JSON.stringify(dynamicProviders, null, 2))
  } catch {
    // Silent — memory-only mode
  }
}

/** Get merged provider map (built-in + dynamic) */
export function getAllProviders() {
  return { ...PROVIDERS, ...dynamicProviders }
}

/** Register a new provider at runtime */
export function registerProvider(id, config) {
  if (PROVIDERS[id]) throw new Error('provider_id_reserved')
  if (!config.name || !config.baseUrl) throw new Error('name_and_baseUrl_required')
  dynamicProviders[id] = {
    name: config.name,
    baseUrl: config.baseUrl,
    keyEnv: config.keyEnv || `DYNAMIC_${id.toUpperCase()}_KEY`,
    defaultModel: config.defaultModel || config.models?.[0] || 'default',
    aliases: config.aliases || {},
    models: config.models || [],
    description: config.description || '',
    local: true,
    dynamic: true,
  }
  saveDynamicProviders()
  return dynamicProviders[id]
}

/** Remove a runtime provider */
export function unregisterProvider(id) {
  if (!dynamicProviders[id]) throw new Error('provider_not_found')
  delete dynamicProviders[id]
  saveDynamicProviders()
  return { removed: id }
}

/** List only runtime providers */
export function listDynamicProviders() {
  return dynamicProviders
}

// ── Model alias resolver ───────────────────────────────────────
function resolveModel(providerId, model) {
  const allProviders = getAllProviders()
  const provider = allProviders[providerId]
  if (!provider) throw new Error('unsupported_provider')
  // Check aliases first
  if (provider.aliases && provider.aliases[model]) {
    return provider.aliases[model]
  }
  // Use default if no model specified
  if (!model) return provider.defaultModel
  return model
}

// ── Public API ─────────────────────────────────────────────────

/** List provider IDs that have API keys configured */
export function configuredProviders(env = process.env) {
  const allProviders = getAllProviders()
  return Object.entries(allProviders)
    .filter(([, config]) => {
      // openai-compatible only shows when URL is set
      if (config.keyEnv === 'OPENAI_COMPATIBLE_API_KEY') {
        return Boolean(env.OPENAI_COMPATIBLE_URL)
      }
      if (config.local || config.dynamic) return true
      return Boolean(env[config.keyEnv])
    })
    .map(([id]) => id)
}

/** Full provider metadata for the /v1/config endpoint */
export function providerCatalog(env = process.env) {
  const allProviders = getAllProviders()
  return Object.fromEntries(
    Object.entries(allProviders).map(([id, config]) => [
      id,
      {
        name: config.name,
        models: config.models,
        defaultModel: config.defaultModel,
        aliases: config.aliases || {},
        configured: config.keyEnv === 'OPENAI_COMPATIBLE_API_KEY'
          ? Boolean(env.OPENAI_COMPATIBLE_URL)
          : config.local || config.dynamic ? true : Boolean(env[config.keyEnv]),
        free: config.free || false,
        local: config.local || false,
        dynamic: config.dynamic || false,
        mcp: config.mcp || false,
        description: config.description || '',
      },
    ]),
  )
}

/** Health-check a single provider endpoint */
export async function healthCheck(providerId, env = process.env) {
  const allProviders = getAllProviders()
  const config = allProviders[providerId]
  if (!config) throw new Error('unsupported_provider')

  const apiKey = (config.local || config.dynamic) ? (env[config.keyEnv] || 'no-auth') : env[config.keyEnv]
  if (!apiKey && !(config.local || config.dynamic)) {
    return { provider: providerId, healthy: false, reason: 'not_configured' }
  }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let headers = config.local && !apiKey ? {} : { authorization: `Bearer ${apiKey}` }
    // LiteLLM instances sometimes use different auth header
    if (providerId.startsWith('litellm-')) {
      headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {}
    }

    const res = await fetch(`${config.baseUrl}/models`, {
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return {
      provider: providerId,
      healthy: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    }
  } catch (error) {
    return {
      provider: providerId,
      healthy: false,
      reason: error.name === 'AbortError' ? 'timeout' : error.message,
      latencyMs: Date.now() - start,
    }
  }
}

/** Health-check all configured providers */
export async function healthCheckAll(env = process.env) {
  const providers = configuredProviders(env)
  const results = await Promise.allSettled(providers.map((id) => healthCheck(id, env)))
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : { provider: providers[i], healthy: false, reason: r.reason?.message }))
}

/** Route a chat completion to a provider with fallback */
export async function routeChat(
  { provider, model, messages, temperature = 0.7, maxTokens, stream = false },
  env = process.env,
) {
  const allProviders = getAllProviders()
  const config = allProviders[provider]
  if (!config) throw new Error('unsupported_provider')

  // Handle naga1 aliases by scanning all providers if model is an alias
  let resolvedModel = model
  let targetProvider = provider
  if (model && !config.models.includes(model) && !Object.values(config.aliases || {}).includes(model)) {
    for (const [pid, pconfig] of Object.entries(allProviders)) {
      if (pconfig.aliases && pconfig.aliases[model]) {
        targetProvider = pid
        resolvedModel = pconfig.aliases[model]
        break
      }
    }
  } else {
    resolvedModel = resolveModel(provider, model)
  }

  const target = allProviders[targetProvider]
  const isLocal = target.local || target.dynamic
  const apiKey = isLocal ? (env[target.keyEnv] || 'no-auth') : env[target.keyEnv]
  if (!apiKey && !isLocal) throw new Error('provider_not_configured')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages_required')

  const payload = {
    model: resolvedModel,
    messages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(stream ? { stream: true } : {}),
  }

  const headers = {
    'content-type': 'application/json',
    ...(apiKey && apiKey !== 'no-auth' ? { authorization: `Bearer ${apiKey}` } : {}),
  }

  const response = await fetch(`${target.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (stream) {
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      const error = new Error(errBody?.error?.message || `provider_http_${response.status}`)
      error.statusCode = response.status
      throw error
    }
    return { stream: response.body, provider: targetProvider, model: resolvedModel }
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body?.error?.message || `provider_http_${response.status}`)
    error.statusCode = response.status
    throw error
  }
  return { ...body, _provider: targetProvider, _model: resolvedModel }
}

/** Route with automatic fallback across configured providers */
export async function routeChatWithFallback(params, env = process.env) {
  const providers = configuredProviders(env)
  if (providers.length === 0) throw new Error('no_providers_configured')

  const errors = []
  for (const pid of params.provider ? [params.provider, ...providers.filter((p) => p !== params.provider)] : providers) {
    try {
      return await routeChat({ ...params, provider: pid }, env)
    } catch (error) {
      errors.push({ provider: pid, error: error.message })
      if (error.statusCode === 401 || error.statusCode === 403) continue
      if (error.message === 'provider_not_configured') continue
    }
  }
  const error = new Error('all_providers_failed')
  error.errors = errors
  error.statusCode = 502
  throw error
}

export { PROVIDERS }
