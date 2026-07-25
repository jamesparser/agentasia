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
    plannedModels: ['naga1-mini', 'naga1-large'],
    capabilities: ['chat', 'vision', 'agentic-tools', 'multilingual-tts'],
    localFallback: 'webgpu',
    futureFreeCompute: 'gpucloud',
  },
  integrations: {
    composio: 'planned-server-side',
    agensi: 'planned-server-side',
    stripe: 'planned-server-side',
    scheduledTasks: 'planned-server-side',
  },
} as const
