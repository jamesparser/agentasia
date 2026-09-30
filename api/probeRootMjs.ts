// Does a root-level .mjs import resolve? (candidate fix for the SSRF validator)
import { SHARED_MJS } from '../shared/proxy-target.mjs'

export default {
  fetch() {
    return new Response(JSON.stringify({ mode: SHARED_MJS }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
