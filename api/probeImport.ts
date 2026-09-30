// TEMPORARY PROBE: does importing ../src/... break module load?
import { validateProxyTarget } from '../src/lib/skills/proxy-target'

export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    const check = validateProxyTarget(url.searchParams.get('url'))
    return new Response(JSON.stringify({ mode: 'import-works', ok: check.ok }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
