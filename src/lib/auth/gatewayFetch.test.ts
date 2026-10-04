import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getIdToken = vi.fn()
vi.mock('./index', () => ({ auth: { getIdToken: () => getIdToken() } }))
vi.mock('@/lib/llm/managed-lane', () => ({
  gatewayBase: () => 'https://gw.example',
}))

import { gatewayFetch } from './gatewayFetch'

describe('gatewayFetch', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const sentAuth = () =>
    new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get('authorization')

  it('sends the signed-in ID token to the gateway', async () => {
    getIdToken.mockResolvedValue('real.id.token')
    await gatewayFetch('https://gw.example/v1/chat/completions', {
      headers: { authorization: 'Bearer placeholder' },
    })
    expect(sentAuth()).toBe('Bearer real.id.token')
  })

  it('drops the placeholder Authorization header for a guest', async () => {
    getIdToken.mockResolvedValue(null)
    await gatewayFetch('https://gw.example/v1/chat/completions', {
      headers: { authorization: 'Bearer placeholder' },
    })
    expect(sentAuth()).toBeNull()
  })

  it('leaves requests to other hosts untouched', async () => {
    getIdToken.mockResolvedValue('real.id.token')
    await gatewayFetch('https://other.example/x', {
      headers: { authorization: 'Bearer theirs' },
    })
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get('authorization')).toBe('Bearer theirs')
  })
})
