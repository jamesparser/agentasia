// TEMPORARY PROBE - delete after reading the result.
// Named HTTP method export.
export function GET() {
  return new Response(JSON.stringify({ mode: 'named-GET' }), {
    headers: { 'content-type': 'application/json' },
  })
}
