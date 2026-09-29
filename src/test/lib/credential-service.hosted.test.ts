/**
 * Regression test for the failure that kept the demo off Nebius.
 *
 * The hosted AgentAsia lane is resolved from build-time config, not from a
 * stored credential: credentials persist through Yjs, and for an anonymous
 * visitor on the static deployment Yjs never syncs, so the credential list is
 * empty. Before this, CredentialService.getDecryptedConfig() returned null for
 * the hosted id, the caller fell back to the in-browser model, and a judge's
 * first message made zero Token Factory calls.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { CredentialService } from '@/lib/credential-service'
import { HOSTED_LANE_CREDENTIAL_ID, useLLMModelStore } from '@/stores/llmModelStore'
import { MANAGED_GATEWAY_DEFAULT } from '@/config/agentasia'

const env = import.meta.env as Record<string, string>

beforeEach(() => {
  useLLMModelStore.setState({
    credentials: [],
    selectedProviderId: null,
    selectedProviderType: null,
    selectedModels: {},
    selectedCredentialId: null,
  })
  delete env.VITE_AGENTASIA_GATEWAY_URL
})

describe('hosted lane with no stored credentials', () => {
  it('resolves a usable config from the gateway default', async () => {
    const cfg = await CredentialService.getDecryptedConfig(HOSTED_LANE_CREDENTIAL_ID)
    expect(cfg).not.toBeNull()
    expect(cfg!.provider).toBe('openai-compatible')
    expect(cfg!.baseUrl).toBe(`${MANAGED_GATEWAY_DEFAULT}/v1`)
    expect(cfg!.model).toMatch(/Nemotron-3-Nano/i)
    // no secret on the wire: the gateway holds the Token Factory key
    expect(cfg!.apiKey).toBeFalsy()
    expect(JSON.stringify(cfg)).not.toMatch(/NEBIUS_API_KEY|sk-motherbrain/)
  })

  it('still returns null for an unknown credential id', async () => {
    expect(await CredentialService.getDecryptedConfig('does-not-exist')).toBeNull()
  })

  it('selects the hosted lane when nothing is chosen', () => {
    const st = useLLMModelStore.getState()
    expect(st.getSelectedProvider()?.id).toBe(HOSTED_LANE_CREDENTIAL_ID)
    expect(st.getSelectedProvider()?.provider).toBe('openai-compatible')
    expect(st.getSelectedModel()).toMatch(/Nemotron-3-Nano/i)
  })

  it('honours a real credential over the synthetic lane', async () => {
    useLLMModelStore.setState({
      credentials: [
        {
          id: 'user-own',
          provider: 'openai-compatible',
          encryptedApiKey: 'x',
          baseUrl: 'https://self-hosted.example/v1',
          timestamp: new Date(),
        } as never,
      ],
      selectedProviderId: 'user-own',
    })
    const st = useLLMModelStore.getState()
    expect(st.getSelectedProvider()?.id).toBe('user-own')
  })
})
