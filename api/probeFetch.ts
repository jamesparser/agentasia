// TEMPORARY PROBE - delete after reading the result.
// default { fetch } - the shape api/proxy.ts currently uses.
export default {
  fetch() {
    return new Response(JSON.stringify({ mode: 'default-fetch' }), {
      headers: { 'content-type': 'application/json' },
    })
  },
}
