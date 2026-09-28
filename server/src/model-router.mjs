// AgentAsia Model Router — multi-provider gateway with fallback, aliasing, and runtime provider registry
// AgentAsia runs as a browser-first agentic harness — providers are selected in the UI, not via env vars.
// The 'openai-compatible' slot accepts baseUrl + apiKey from the request body for fully dynamic routing.

const PROVIDERS = {
  // ── Nebius Token Factory — NVIDIA Nemotron (hackathon-required lane, ordered first) ──
  // Compliance: "runs on Nebius" == a runtime call to the Token Factory inference API.
  // Every turn that hits this provider satisfies that requirement.
  nebius: {
    name: 'Nebius Token Factory',
    baseUrl: 'https://api.tokenfactory.nebius.com/v1',
    keyEnv: 'NEBIUS_API_KEY',
    defaultModel: 'nvidia/nemotron-3-nano-30b-a3b',
    models: [
      'nvidia/nemotron-3-nano-30b-a3b',
      'nvidia/nemotron-3-nano-omni-30b-a3b',
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/nemotron-3-ultra-550b-a55b',
    ],
    aliases: {},
    description:
      'NVIDIA Nemotron 3 open-weight models served on Nebius Token Factory. Free tier = Nano 30B; Pro = Super 120B; Enterprise = Ultra 550B or a dedicated endpoint.',
  },

  // ── Primary managed routes ────────────────────────────────── ──────────────────────────────────
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-v4-pro', 'deepseek-v4-flash'],
  },

  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'deepseek/deepseek-chat',
    models: ['deepseek/deepseek-chat', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro'],
  },

  venice: {
    name: 'Venice AI',
    baseUrl: 'https://api.venice.ai/api/v1',
    keyEnv: 'VENICE_API_KEY',
    defaultModel: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'qwen3-vl-235b-a22b', 'google-gemma-4-31b-it'],
  },

  // ── Free / budget routes ─────────────────────────────────────
  'asi1-mini': {
    name: 'CUDOS ASI Cloud',
    baseUrl: 'https://inference.asicloud.cudos.org/v1',
    keyEnv: 'CUDOS_ASI_KEY',
    defaultModel: 'asi1-mini',
    models: ['asi1-mini'],
    free: true,
  },

  asi1: {
    name: 'ASI1',
    baseUrl: 'https://api.asi1.ai/v1',
    keyEnv: 'ASI1_API_KEY',
    defaultModel: 'asi1',
    models: ['asi1'],
    free: true,
  },

  // ── Regional / alt routes ────────────────────────────────────
  redpill: {
    name: 'Redpill/Phala',
    baseUrl: 'https://api.redpill.ai/v1',
    keyEnv: 'REDPILL_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-vl-30b-a3b-instruct'],
  },

  zhipu: {
    name: 'Z.AI (Zhipu GLM)',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    keyEnv: 'ZHIPU_API_KEY',
    defaultModel: 'zai/glm-4.7-flash',
    models: ['zai/glm-4.7-flash', 'zai/glm-4.6v-flash'],
    free: true,
  },

  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  },

  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    keyEnv: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large-latest'],
  },

  agentrouter: {
    name: 'AgentRouter',
    baseUrl: 'https://agentrouter.org/v1',
    keyEnv: 'AGENTROUTER_API_KEY',
    defaultModel: 'deepseek-v3.2',
    models: ['deepseek-v3.2', 'claude-haiku-4-5', 'glm-5.1'],
  },

  crowllm: {
    name: 'CrowLLM',
    baseUrl: 'https://crowllm.com/v1',
    keyEnv: 'CROWLLM_API_KEY',
    defaultModel: 'gemma-4-e2b',
    models: ['gemma-4-e2b'],
  },

  inception: {
    name: 'Inception Labs',
    baseUrl: 'https://api.inceptionlabs.ai/v1',
    keyEnv: 'INCEPTION_API_KEY',
    defaultModel: 'inception/mercury-2',
    models: ['inception/mercury-2'],
  },

  // ── Reverse-engineered DeepSeek proxies ──────────────────────
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

  // ── LiteLLM router tiers ─────────────────────────────────────
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

  // ── OpenAI Compatible (UI-driven custom provider slot) ───────
  // No env vars needed — the browser UI sends baseUrl + apiKey per request.
  // Always shows in the provider list so the user can select it and type their own endpoint.
  'openai-compatible': {
    name: 'OpenAI Compatible',
    baseUrl: '',  // set per-request from request body
    keyEnv: null, // set per-request from request body
    defaultModel: '',  // set per-request from request body
    models: [],
    description: 'Point at any OpenAI-compatible API — provide baseUrl, apiKey, and model in the request',
    local: true,
    alwaysConfigured: true,
  },
}

// ── Dynamic provider registry (runtime add/remove via API) ─────
let dynamicProviders = {}
try {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const dynamicFile = path.join('/data', 'dynamic-providers.json')
  if (fs.existsSync(dynamicFile)) {
    dynamicProviders = JSON.parse(fs.readFileSync(dynamicFile, 'utf-8'))
  }
} catch {
  // Memory-only mode if /data not available
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
    keyEnv: config.keyEnv || null,
    defaultModel: config.defaultModel || config.models?.[0] || 'default',
    models: config.models || [],
    description: config.description || '',
    local: true,
    dynamic: true,
    alwaysConfigured: true,
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
  if (provider.aliases && provider.aliases[model]) {
    return provider.aliases[model]
  }
  if (!model) return provider.defaultModel
  return model
}

// ── Public API ─────────────────────────────────────────────────

/** List provider IDs that are available (configured or always-configured) */
export function configuredProviders(env = process.env) {
  const allProviders = getAllProviders()
  const ids = Object.entries(allProviders)
    .filter(([, config]) => {
      if (config.alwaysConfigured) return true
      if (config.local || config.dynamic) return true
      return Boolean(env[config.keyEnv])
    })
    .map(([id]) => id)
  // Nebius is the guaranteed lane: ordered first so it is preferred and so
  // non-Nebius/free lanes become fallbacks instead of the default path.
  return ids.includes('nebius')
    ? ['nebius', ...ids.filter((id) => id !== 'nebius')]
    : ids
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
        configured: config.alwaysConfigured
          ? true
          : config.local || config.dynamic
            ? true
            : Boolean(env[config.keyEnv]),
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

  // openai-compatible and dynamic providers have no fixed URL — skip
  if (config.alwaysConfigured) {
    return { provider: providerId, healthy: null, reason: 'endpoint_is_per-request' }
  }

  const apiKey = config.local ? (env[config.keyEnv] || 'no-auth') : env[config.keyEnv]
  if (!apiKey && !config.local) {
    return { provider: providerId, healthy: false, reason: 'not_configured' }
  }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let headers = config.local && !apiKey ? {} : { authorization: `Bearer ${apiKey}` }
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

/**
 * Route a chat completion to a provider with optional fallback.
 * The 'openai-compatible' and dynamic providers accept baseUrl + apiKey from the request body
 * so the browser UI can pass them without any env-var setup.
 */
export async function routeChat(
  { provider, model, messages, temperature = 0.7, maxTokens, stream = false, baseUrl, apiKey },
  env = process.env,
) {
  const allProviders = getAllProviders()
  const config = allProviders[provider]
  if (!config) throw new Error('unsupported_provider')

  // Resolve model through aliases or default
  let resolvedModel = model
  let targetProvider = provider
  if (model && config.models?.length && !config.models.includes(model) && !Object.values(config.aliases || {}).includes(model)) {
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

  // Determine the actual URL and key to use
  let effectiveBaseUrl = target.baseUrl
  let effectiveApiKey = target.local || target.dynamic ? (env[target.keyEnv] || '') : (env[target.keyEnv] || '')

  // Per-request overrides for openai-compatible and alwaysConfigured providers
  if (target.alwaysConfigured) {
    // Use request body values if provided, otherwise fall back to env/config
    effectiveBaseUrl = baseUrl || target.baseUrl || env.OPENAI_COMPATIBLE_URL || ''
    effectiveApiKey = apiKey || (target.keyEnv ? env[target.keyEnv] : '') || ''
  } else {
    // For fixed providers, request-level overrides also work (useful for proxies)
    if (baseUrl) effectiveBaseUrl = baseUrl
    if (apiKey) effectiveApiKey = apiKey
  }

  // Guard: cloud providers need an API key
  if (!target.alwaysConfigured && !target.local && !target.dynamic && !effectiveApiKey) {
    throw new Error('provider_not_configured')
  }

  if (!effectiveBaseUrl) throw new Error('no_base_url')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages_required')

  const effectiveModel = resolvedModel || target.defaultModel
  if (!effectiveModel) throw new Error('no_model')

  const payload = {
    model: effectiveModel,
    messages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(stream ? { stream: true } : {}),
  }

  const headers = {
    'content-type': 'application/json',
    ...(effectiveApiKey ? { authorization: `Bearer ${effectiveApiKey}` } : {}),
  }

  const endpoint = effectiveBaseUrl.replace(/\/+$/, '') + '/chat/completions'
  const response = await fetch(endpoint, {
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
    return { stream: response.body, provider: targetProvider, model: effectiveModel }
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body?.error?.message || `provider_http_${response.status}`)
    error.statusCode = response.status
    throw error
  }
  return { ...body, _provider: targetProvider, _model: effectiveModel }
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

/**
 * Resolve an OpenAI-style /chat/completions body into a gateway target.
 * Lets the browser app point a standard OpenAI-compatible client at AgentAsia's
 * own gateway, where Nebius Token Factory is the preferred lane.
 *
 * Rules:
 *  - `model` may be bare ("nvidia/nemotron-3-nano-30b-a3b") or gateway-prefixed
 *    ("nebius/nvidia/nemotron-3-nano-30b-a3b"). A prefix that matches a known
 *    provider id selects that provider and is stripped from the model.
 *  - explicit `provider` in the body always wins.
 *  - otherwise: env.GATEWAY_DEFAULT_PROVIDER, else 'nebius' if it is configured,
 *    else the first configured provider.
 */
export function resolveGatewayTarget(body = {}, env = process.env) {
  const allProviders = getAllProviders()
  const rawModel = String(body.model || '').trim()
  let provider = String(body.provider || '').trim()
  let model = rawModel

  if (!provider && rawModel.includes('/')) {
    const [head, ...rest] = rawModel.split('/')
    if (allProviders[head] && rest.length) {
      provider = head
      model = rest.join('/')
    }
  }

  if (!provider) {
    const configured = configuredProviders(env)
    provider = env.GATEWAY_DEFAULT_PROVIDER || (configured.includes('nebius') ? 'nebius' : configured[0]) || 'nebius'
  }

  return {
    provider,
    model,
    params: {
      provider,
      model,
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.max_tokens ?? body.maxTokens,
      stream: body.stream === true,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
    },
    useFallback: body.fallback === true,
  }
}

/** Route a chat completion using the gateway's preferred strategy. */
export async function routeGatewayChat(body = {}, env = process.env) {
  const target = resolveGatewayTarget(body, env)
  if (!Array.isArray(target.params.messages) || target.params.messages.length === 0) {
    const error = new Error('messages_required')
    error.statusCode = 400
    throw error
  }
  if (!target.params.model && target.provider !== 'openai-compatible') {
    // allow the provider default model to apply
    delete target.params.model
  }
  const result = target.useFallback
    ? await routeChatWithFallback(target.params, env)
    : await routeChat(target.params, env)
  return { result, provider: target.provider, model: target.params.model }
}

export { PROVIDERS }
