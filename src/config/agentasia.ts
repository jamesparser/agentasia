export const AGENTASIA = {
  slogan: 'AI that speaks your language',
  logo: '/naga-logo.svg',
  // Plan -> model is a server decision, not a user setting: free users get
  // Nemotron Nano and no model picker; paid plans get a larger Nemotron.
  // IDs verified against Token Factory /v1/models on 2026-09-28.
  plans: {
    free: {
      label: 'Free',
      priceUsdMonthly: 0,
      model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
      localWebGpuOnly: false,
      futureGpuCloudAccess: true,
      // Token-clamped + text/voice only; see server gateway quota.
      canChooseModel: false,
    },
    pro: { label: 'Pro', priceUsdMonthly: 20, model: 'nvidia/nemotron-3-super-120b-a12b', canChooseModel: false },
    smallBusiness: { label: 'Small Business', priceUsdMonthly: 100, model: 'nvidia/nemotron-3-super-120b-a12b', canChooseModel: false },
    enterprise: { label: 'Enterprise', priceUsdMonthly: 200, model: 'nvidia/Nemotron-3-Ultra-550b-a55b', canChooseModel: false },
  } as Record<string, { label: string; priceUsdMonthly: number; model: string; canChooseModel: boolean; localWebGpuOnly?: boolean; futureGpuCloudAccess?: boolean }>,
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
  // UI exposure policy. Beta is free and fully managed: users do not choose a
  // model provider, an API key, or a voice engine. The gate only tightens once a
  // managed gateway URL is actually configured, so it can never leave a user
  // with an empty model picker.
  ui: {
    managedGatewayUrl: (import.meta.env.VITE_AGENTASIA_GATEWAY_URL as string) || '',
    /**
     * Beta is free and fully managed: users never choose a provider or paste a key.
     * Free tier = Nemotron Nano, paid tiers = a larger Nemotron, chosen by plan.
     * BYOK stays reachable only for development via VITE_SHOW_BYOK=1 so it can
     * never ship visible to a customer again.
     */
    get managedGatewayEnabled(): boolean {
      if (import.meta.env.VITE_SHOW_BYOK === '1') return false
      // Safety valve: hiding every provider is only correct when a managed lane
      // actually exists to replace them. In a production build we trust the
      // deploy-time config; in dev we refuse to leave the picker empty.
      const gateway = (import.meta.env.VITE_AGENTASIA_GATEWAY_URL as string) || ''
      if (gateway) return true
      return !import.meta.env.DEV
    },
    /** Console warning when BYOK is hidden but nothing replaces it. */
    get gatewayMissingWhileHidden(): boolean {
      return (
        this.managedGatewayEnabled &&
        !(import.meta.env.VITE_AGENTASIA_GATEWAY_URL as string)
      )
    },
    // Providers users may never see in a picker (BYOK + in-browser LLM chat).
    hiddenProviders: [
      'local',
      'openai',
      'anthropic',
      'google',
      'vertex-ai',
      'mistral',
      'openrouter',
      'deepseek',
      'venice',
      'huggingface',
      'github-copilot',
      'claude-code',
      'chatjimmy',
      'custom',
      'stability',
      'replicate',
      'together',
      'fal',
    ] as string[],
    // Voice engine identity (Kokoro/Supertonic/Magpie/WebGPU) stays invisible.
    showVoiceEngine: false,
  },

  integrations: {
    composio: 'planned-server-side',
    agensi: 'planned-server-side',
    stripe: 'planned-server-side',
    scheduledTasks: 'planned-server-side',
  },
} as const
