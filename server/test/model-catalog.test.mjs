import assert from 'node:assert/strict'
import { canonicalizeModelId, publicModelIds } from '../src/model-catalog.mjs'

// The failure this pins was found in production, not in review: the browser model
// picker formats an id for display and some selection paths send that display form
// back as the model, so the provider answered 404 and every fresh visitor's first
// message failed. The response looked like a provider outage, which is why it is
// worth a test that names the exact string seen on the wire.

const CANON = 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B'
const SUPER = 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B'
const ULTRA = 'nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B'

// ── default catalog ────────────────────────────────────────────
{
  delete process.env.GATEWAY_PUBLIC_MODEL_IDS
  assert.deepEqual(publicModelIds(), [CANON])

  // The production bug, verbatim: the org prefix dropped, vendor word kept.
  assert.equal(canonicalizeModelId('NVIDIA-Nemotron-3-Nano-30B-A3B'), CANON)
  // Separator and case noise from a hyphen-splitting picker still matches, because
  // comparison is alphanumeric-only.
  assert.equal(canonicalizeModelId('nvidia nemotron 3 nano 30b a3b'), CANON)
  // Already canonical: untouched.
  assert.equal(canonicalizeModelId(CANON), CANON)

  // Known boundary, pinned so it cannot regress silently in either direction.
  // A label that also drops the vendor word does NOT match: the catalog base keeps
  // "nvidia" from the model name, so there is nothing left to strip the input down
  // to. It passes through and the provider answers 404. Not widened here because
  // loosening the matcher changes routing on a live gateway; if the picker is ever
  // seen emitting this form, fix the picker or extend the matcher deliberately.
  assert.equal(canonicalizeModelId('Nemotron-3-Nano-30B-A3B'), 'Nemotron-3-Nano-30B-A3B')

  // Unknown id passes through rather than being coerced to the default, so a model
  // added to the catalog later still routes end to end.
  assert.equal(canonicalizeModelId('some/other-model'), 'some/other-model')
  // Non-strings and empty values survive, so the caller's own validation answers.
  assert.equal(canonicalizeModelId(undefined), undefined)
  assert.equal(canonicalizeModelId(null), null)
  assert.equal(canonicalizeModelId(''), '')
  console.log('  [1] default catalog: org-stripped label resolves, unknown and vendor-stripped pass through')
}

// ── multi-model catalog: the plan ladder must survive a round-trip ───────────
{
  process.env.GATEWAY_PUBLIC_MODEL_IDS = [CANON, SUPER, ULTRA].join(', ')
  try {
    assert.equal(publicModelIds().length, 3, 'whitespace around entries is trimmed')

    // Free/Pro resolve to Nano or Super and Enterprise to Ultra, so each display
    // form has to land on its own id. A cross-match would quietly serve the wrong
    // tier, which is worse than a 404 because nothing looks broken.
    assert.equal(canonicalizeModelId('NVIDIA-Nemotron-3-Nano-30B-A3B'), CANON)
    assert.equal(canonicalizeModelId('NVIDIA-Nemotron-3-Super-120B-A12B'), SUPER)
    assert.equal(canonicalizeModelId('NVIDIA-Nemotron-3-Ultra-550B-A55B'), ULTRA)
    // Size suffixes must not be confused with each other.
    assert.notEqual(canonicalizeModelId('NVIDIA-Nemotron-3-Super-120B-A12B'), CANON)
    assert.notEqual(canonicalizeModelId('NVIDIA-Nemotron-3-Ultra-550B-A55B'), SUPER)
    console.log('  [2] multi-model catalog: each tier resolves to itself, no cross-match')
  } finally {
    delete process.env.GATEWAY_PUBLIC_MODEL_IDS
  }
}

console.log('model-catalog tests passed')
