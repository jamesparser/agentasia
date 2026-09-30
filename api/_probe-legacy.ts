// TEMPORARY PROBE - delete after reading the result.
// Legacy Node signature: (req, res).
export default function handler(_req: any, res: any) {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ mode: 'legacy-req-res' }))
}
