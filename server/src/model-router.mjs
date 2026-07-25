const PROVIDERS = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
  },
  venice: {
    baseUrl: 'https://api.venice.ai/api/v1',
    keyEnv: 'VENICE_API_KEY',
  },
}

export function configuredProviders(env = process.env) {
  return Object.entries(PROVIDERS)
    .filter(([, config]) => Boolean(env[config.keyEnv]))
    .map(([id]) => id)
}

export async function routeChat({ provider, model, messages, temperature, maxTokens }, env = process.env) {
  const target = PROVIDERS[provider]
  if (!target) throw new Error('unsupported_provider')
  const apiKey = env[target.keyEnv]
  if (!apiKey) throw new Error('provider_not_configured')
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('messages_required')

  const response = await fetch(`${target.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.7,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body?.error?.message || `provider_http_${response.status}`)
    error.statusCode = response.status
    throw error
  }
  return body
}
