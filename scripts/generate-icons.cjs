const sharp = require('sharp')
const { join } = require('path')
const { execSync } = require('child_process')

const publicDir = join(__dirname, '..', 'public')
const brandDir = join(publicDir, 'brand')

/**
 * The AgentAsia badge icons: the naga mark in white on the AgentAsia blue plate.
 *
 * These used to be an inline SVG of three rounded blobs on blue - the leftover
 * shape of the upstream devs.new mark after the triangle was removed, which is
 * why every icon on the site, tab and home screen read as "three dots". That SVG
 * is gone. Everything here is now composed from the same master as the rest of
 * the brand set, so there is exactly one mark and one place to change it:
 *
 *   python3 scripts/brand/generate-brand-assets.py   -> public/brand/naga-solid-*.png
 *   node scripts/generate-icons.cjs                  -> the plates below
 *
 * If the master is missing, that means the brand script has not been run; say so
 * instead of quietly falling back to a different logo.
 */
const MASTER_WHITE = join(brandDir, 'naga-solid-white.png')
const MASTER_BLACK = join(brandDir, 'naga-solid-black.png')
const PLATE = '#6aa1ff'

/**
 * How much of the plate the mark fills.
 *
 * `any` icons get the full plate. `maskable` icons get less, because the platform
 * crops to a circle or squircle and anything outside the inner 80% is lost -
 * 80% is the safe zone, so the mark is set at 60% to keep clear of it.
 */
const SCALE = { any: 0.82, maskable: 0.6, apple: 0.86 }

function optimizePng(filePath) {
  try {
    execSync(`oxipng -o max --strip safe "${filePath}"`, { stdio: 'pipe' })
  } catch {
    console.warn(
      `Warning: oxipng not found or failed. Install with: brew install oxipng`,
    )
  }
}

async function plate(masterPath, size, scale, outPath) {
  const markSize = Math.round(size * scale)
  const mark = await sharp(masterPath)
    .resize(markSize, markSize, { fit: 'contain', background: 'transparent' })
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PLATE,
    },
  })
    .composite([
      {
        input: mark,
        gravity: 'centre',
        blend: 'over',
      },
    ])
    .png()
    .toFile(outPath)

  console.log(`Generated ${outPath.replace(publicDir + '/', '')}`)
  return outPath
}

async function generateIcons() {
  for (const master of [MASTER_WHITE, MASTER_BLACK]) {
    try {
      await sharp(master).metadata()
    } catch {
      throw new Error(
        `Missing brand master ${master}. Run: python3 scripts/brand/generate-brand-assets.py`,
      )
    }
  }

  const generated = []

  for (const size of [192, 512]) {
    generated.push(
      await plate(MASTER_WHITE, size, SCALE.any, join(publicDir, `icon-${size}.png`)),
    )
    generated.push(
      await plate(
        MASTER_WHITE,
        size,
        SCALE.maskable,
        join(publicDir, `icon-${size}-maskable.png`),
      ),
    )
  }

  generated.push(
    await plate(
      MASTER_WHITE,
      180,
      SCALE.apple,
      join(publicDir, 'apple-touch-icon.png'),
    ),
  )

  console.log('\nOptimizing with OxiPNG...')
  for (const filePath of generated) optimizePng(filePath)

  console.log('\nAll icons generated and optimized successfully!')
}

generateIcons().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
