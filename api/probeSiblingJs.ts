// Candidate fix: ask for the .js specifier, which @vercel/node's esbuild pass
// maps back onto the .ts source. Extensionless imports do not resolve at
// runtime under "type": "module".
import { SHARED_OK } from './probeShared.js'

export default {
  fetch() {
    return new Response(JSON.stringify({ mode: SHARED_OK }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
