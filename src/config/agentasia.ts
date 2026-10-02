/**
 * The AgentAsia managed gateway: an OpenAI-compatible server on our own VPS
 * that holds the Nebius Token Factory key, the Tavily search loop and the
 * spend breaker. The browser only ever needs its public URL - no client secret,
 * and `/v1/chat/completions` is the only billable route a visitor can reach
 * (model list and memory policy are public; spend/providers/config need the
 * operator token). Published through a named Cloudflare tunnel so the hostname
 * survives connector restarts, unlike a quick tunnel.
 *
 * `VITE_AGENTASIA_GATEWAY_URL` overrides it per environment; the default keeps
 * the managed lane working even if a deploy forgets to set the variable.
 */
export const MANAGED_GATEWAY_DEFAULT = 'https://agentasia-gateway.realcryptocap.com'

export const AGENTASIA = {
  slogan: 'AI that speaks your language' as const,
  // Raster only: the brief rules out SVG, and the upstream devs.new triangle is
  // not ours to use. `logo`/`logoDark` are the head crop, which is the only form
  // of the drawing that stays legible at tab and header sizes; `logoDetailed` is
  // the entire artwork for large placements (hero, about, store listings). All of
  // them come from scripts/brand/agentasia-naga-source.jpg via
  // scripts/brand/generate-brand-assets.py - do not hand-edit the PNGs.
  logo: '/brand/naga-head-black.png',
  logoDark: '/brand/naga-head-white.png',
  logoDetailed: '/brand/naga-ink-black.png',
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
  // UI exposure policy. Beta is free and fully managed: users do not choose a
  // model provider, an API key, or a voice engine. The gate only tightens once a
  // managed gateway URL is actually configured, so it can never leave a user
  // with an empty model picker.
  ui: {
    managedGatewayUrl: (import.meta.env.VITE_AGENTASIA_GATEWAY_URL as string) || MANAGED_GATEWAY_DEFAULT,
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
      // 'openai-compatible' stays VISIBLE on purpose: that is the transport the
      // managed lane itself uses (the gateway speaks the OpenAI wire format).
      // Hiding it left the picker with no selectable hosted provider - every
      // entry was hidden while nothing replaced them.
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
