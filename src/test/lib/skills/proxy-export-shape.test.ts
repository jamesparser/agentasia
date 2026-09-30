/**
 * The reason `/api/proxy` returned a bare 500 in production while every unit test
 * stayed green.
 *
 * `validateProxyTarget` was tested in isolation and the handler body was correct,
 * but nothing asserted how the module is *exported* - and Vercel picks its calling
 * convention from exactly that. A default-exported function is invoked as the
 * classic Node `(req, res)` handler, so `request.url` arrives as a relative path,
 * `new URL()` throws, and the returned `Response` cannot be written. The failure
 * was invisible in logs because the handler never ran.
 *
 * These assertions fail loudly if anyone reverts to `export default function`.
 */
import { describe, expect, it } from 'vitest'

describe('api/proxy Vercel export shape', () => {
  it('exports a Web Standard fetch handler, not a default function', async () => {
    const mod = await import('../../../../api/proxy')

    // A default-exported *function* is the bug: Vercel then passes
    // (IncomingMessage, ServerResponse) instead of a Request.
    expect(typeof mod.default).toBe('object')
    expect(typeof (mod.default as { fetch?: unknown }).fetch).toBe('function')

    // The Web handler contract: one Request in, a Response out.
    const res = await (
      mod.default as { fetch: (r: Request) => Promise<Response> }
    ).fetch(new Request('https://agentasia.vercel.app/api/proxy'))

    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(400) // missing `url` param, but reached our code
    expect(await res.json()).toMatchObject({ error: 'Missing url parameter' })
  })

  it('rejects a disallowed host instead of relaying it', async () => {
    const mod = await import('../../../../api/proxy')
    const res = await (
      mod.default as { fetch: (r: Request) => Promise<Response> }
    ).fetch(
      new Request(
        'https://agentasia.vercel.app/api/proxy?url=https%3A%2F%2Fevil.example%2Fx',
      ),
    )
    expect(res.status).toBe(403)
  })

  it('refuses link-local metadata endpoints even over https', async () => {
    const mod = await import('../../../../api/proxy')
    const res = await (
      mod.default as { fetch: (r: Request) => Promise<Response> }
    ).fetch(
      new Request(
        'https://agentasia.vercel.app/api/proxy?url=https%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data',
      ),
    )
    expect(res.status).toBe(403)
  })
})
