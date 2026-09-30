import { validateProxyTarget } from '../src/lib/skills/proxy-target.js'

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    const check = validateProxyTarget(url.searchParams.get('url'))
    return new Response(JSON.stringify({ mode: 'src-js-import', ok: check.ok }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
