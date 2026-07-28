// AgentAsia Model Router — multi-provider gateway with fallback and aliasing
// Phase 1: All provider integrations + Naga model aliases

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
    aliases: {
      'naga1-large': 'instant',
      'naga1-proxy': 'instant',
    },
    models: ['instant', 'vision', 'expert'],
    description: 'LiteLLM-based reverse proxy for chat.deepseek.com — free, no API key needed',
    local: true,
  },

  'deepseek-reverse': {
    name: 'DeepSeek Reverse Proxy',
    baseUrl: process.env.DEEPSEEK_REVERSE_URL || 'http://localhost:4010/v1',
    keyEnv: 'DEEPSEEK_REVERSE_KEY',
    defaultModel: 'deepseek-chat',
    aliases: {
      'naga1-reverse': 'deepseek-chat',
    },
    models: ['deepseek-chat', 'deepseek-v4-pro', 'deepseek-v4-flash'],
    description: 'Reverse-engineered DeepSeek web chat → OpenAI API (needs wrapper server)',
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
}

// ── Model alias resolver ───────────────────────────────────────
function resolveModel(providerId, model) {
  const provider = PROVIDERS[providerId]
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
  return Object.entries(PROVIDERS)
    .filter(([, config]) => {
      // Local providers always show as configured
      if (config.local) return true
      return Boolean(env[config.keyEnv])
    })
    .map(([id]) => id)
}

/** Full provider metadata for the /v1/config endpoint */
export function providerCatalog(env = process.env) {
  return Object.fromEntries(
    Object.entries(PROVIDERS).map(([id, config]) => [
      id,
      {
        name: config.name,
        models: config.models,
        defaultModel: config.defaultModel,
        aliases: config.aliases || {},
        configured: config.local ? true : Boolean(env[config.keyEnv]),
        free: config.free || false,
        local: config.local || false,
      },
    ]),
  )
}

/** Health-check a single provider endpoint */
export async function healthCheck(providerId, env = process.env) {
  const config = PROVIDERS[providerId]
  if (!config) throw new Error('unsupported_provider')

  const apiKey = config.local ? (env[config.keyEnv] || 'dummy') : env[config.keyEnv]
  if (!apiKey && !config.local) {
    return { provider: providerId, healthy: false, reason: 'not_configured' }
  }

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${config.baseUrl}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
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
  const config = PROVIDERS[provider]
  if (!config) throw new Error('unsupported_provider')

  // Handle naga1 aliases by scanning all providers if model is an alias
  let resolvedModel = model
  let targetProvider = provider
  if (model && !config.models.includes(model) && !Object.values(config.aliases || {}).includes(model)) {
    // Scan all providers for this alias
    for (const [pid, pconfig] of Object.entries(PROVIDERS)) {
      if (pconfig.aliases && pconfig.aliases[model]) {
        targetProvider = pid
        resolvedModel = pconfig.aliases[model]
        break
      }
    }
  } else {
    resolvedModel = resolveModel(provider, model)
  }

  const target = PROVIDERS[targetProvider]
  const apiKey = target.local ? (env[target.keyEnv] || 'dummy') : env[target.keyEnv]
  if (!apiKey && !target.local) throw new Error('provider_not_configured')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages_required')

  const payload = {
    model: resolvedModel,
    messages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(stream ? { stream: true } : {}),
  }

  const response = await fetch(`${target.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
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
      if (error.statusCode === 401 || error.statusCode === 403) continue // auth error, try next
      if (error.message === 'provider_not_configured') continue
    }
  }
  const error = new Error('all_providers_failed')
  error.errors = errors
  error.statusCode = 502
  throw error
}

export { PROVIDERS }
