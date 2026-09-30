// Does a sibling import inside api/ resolve?
import { SHARED_OK } from './probeShared'

export default {
  fetch() {
    return new Response(JSON.stringify({ mode: SHARED_OK }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
