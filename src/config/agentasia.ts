export const AGENTASIA = {
  slogan: 'AI that speaks your language',
  plans: {
    free: {
      label: 'Free',
      priceUsdMonthly: 0,
      localWebGpuOnly: true,
      futureGpuCloudAccess: true,
    },
    pro: { label: 'Pro', priceUsdMonthly: 20 },
    smallBusiness: { label: 'Small Business', priceUsdMonthly: 100 },
    enterprise: { label: 'Enterprise', priceUsdMonthly: 200 },
  },
  modelRouting: {
    defaultMode: 'auto',
    modes: {
      chat: { model: 'freemium-chat', tools: false, vision: false },
      code: { model: 'freemium-coding', tools: false, vision: false },
      agent: { model: 'freemium-agentic-vision', tools: true, vision: true },
    },
    fallbackChain: {
      chat: ['freemium-chat', 'freemium-multilingual'],
      code: ['freemium-coding', 'freemium-chat'],
      agent: ['freemium-agentic-vision', 'freemium-agentic'],
    },
    plannedModels: ['naga1-mini', 'naga1-large'],
    capabilities: ['chat', 'vision', 'agentic-tools', 'multilingual-tts'],
    localFallback: 'webgpu',
    futureFreeCompute: 'gpucloud',
    auditEmail: 'redacted@users.noreply.github.com',
    browserOnlyFreeTier: true,
    languageRouting: {
      common: ['en', 'es', 'pt', 'ja', 'zh-CN', 'zh-TW', 'yue', 'de', 'fr', 'ru', 'pl', 'ko'],
      extended: 'prefer-qwen-or-translation-bridge',
    },
  },
  integrations: {
    composio: 'planned-server-side',
    agensi: 'planned-server-side',
    stripe: 'planned-server-side',
    scheduledTasks: 'planned-server-side',
  },
} as const
