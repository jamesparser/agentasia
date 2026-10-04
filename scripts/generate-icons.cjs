#!/usr/bin/env node
/**
 * Compatibility entry point for the AgentAsia icon set.
 *
 * This used to be a second, independent generator: sharp composited the brand
 * master onto the AgentAsia blue plate and wrote icon-192.png, icon-512.png,
 * both maskable variants and apple-touch-icon.png - the very same files
 * scripts/brand/generate-brand-assets.py also writes. Two generators, one set of
 * outputs, no ordering guarantee: whichever ran last won, and the two did not
 * agree, so an icon could change without any code change.
 *
 * There is now exactly one generator, and it is the Python one, because it owns
 * the parts sharp cannot do: the Otsu ink extraction, the head crop, and the
 * size-dependent resampling that keeps the mark legible at 16px. This file stays
 * so any habit or doc that says "run generate-icons" still works; it just
 * forwards.
 */
const { join } = require('path')
const { spawnSync } = require('child_process')

const generator = join(
  __dirname,
  'brand',
  'generate-brand-assets.py',
)

const result = spawnSync('python3', [generator], { stdio: 'inherit' })

if (result.error) {
  console.error(`Could not run ${generator}: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
