/**
 * The public model catalog and the id repair that goes with it.
 *
 * Split out of index.mjs so it can be unit tested: index.mjs starts a listener on
 * import, which makes it awkward to import in a test, and this logic is the one
 * piece of the gateway whose failure mode was invisible in the response (the
 * provider answered 404 and the browser just showed a failed first message).
 */

const DEFAULT_CATALOG = 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B'

/** The ids this gateway serves, from GATEWAY_PUBLIC_MODEL_IDS or the default. */
export function publicModelIds() {
  return (process.env.GATEWAY_PUBLIC_MODEL_IDS || DEFAULT_CATALOG)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Canonicalise an incoming model id against the public catalog.
 *
 * The browser picker formats ids for display (drops the org prefix, splits on
 * hyphens), and some selection paths send that label back as the model. That was
 * measured in production as "NVIDIA-Nemotron-3-Nano-30B-A3B" reaching the provider
 * and answering 404, so every fresh visitor's first message failed. Match on
 * alphanumeric-only equivalence, tolerating a leading vendor/org word, so any
 * display form resolves to the configured id. Unknown ids pass through untouched,
 * so a model added to GATEWAY_PUBLIC_MODEL_IDS later keeps working end to end.
 */
export function canonicalizeModelId(raw) {
  const ids = publicModelIds()
  if (!raw || typeof raw !== 'string') return raw
  if (ids.includes(raw)) return raw
  const k = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, '')
  const orgs = new Set(ids.map((id) => k((id.split('/')[0] || ''))))
  let probe = k(raw.includes('/') ? raw.split('/').pop() : raw)
  for (let i = 0; i < 2; i++) {
    const lead = [...orgs].find((o) => o && probe.startsWith(o) && probe.length > o.length)
    if (!lead) break
    probe = probe.slice(lead.length)
  }
  const rawProbe = k(raw.includes('/') ? raw.split('/').pop() : raw)
  const hit = ids.find((id) => {
    const base = id.includes('/') ? k(id.split('/').pop()) : k(id)
    // raw form first (label keeps the vendor word); org-stripped as fallback
    // (labels that dropped it); full-id form last (client sent the whole id).
    return base === rawProbe || base === probe || k(id) === k(raw)
  })
  return hit || raw
}
