export const AGENTASIA = {
  slogan: 'AI that speaks your language',
  logo: '/naga-logo.svg',
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
    // The language lane is selected explicitly for extended languages; it is
    // not a fallback for common-language Chat, Code, or Agent requests.
    fallbackChain: {
      chat: ['freemium-chat'],
      code: ['freemium-coding'],
      agent: ['freemium-agentic-vision'],
      language: ['freemium-language'],
    },
    plannedModels: ['naga1-mini', 'naga1-large'],
    capabilities: ['chat', 'vision', 'agentic-tools', 'multilingual-tts'],
    localFallback: 'webgpu',
    futureFreeCompute: 'gpucloud',
    auditEmail: 'redacted@users.noreply.github.com',
    browserOnlyFreeTier: true,
    languageRouting: {
      common: ['en', 'zh-CN', 'zh-TW', 'yue', 'hi', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'bn', 'ur'],
      extended: 'freemium-language',
    },
  },
  integrations: {
    composio: 'planned-server-side',
    agensi: 'planned-server-side',
    stripe: 'planned-server-side',
    scheduledTasks: 'planned-server-side',
  },
} as const
