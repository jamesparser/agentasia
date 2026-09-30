# Brand mark — provenance and rules

## What is here

| File | Use |
|---|---|
| `naga-head-black.png` / `naga-head-white.png` (+ `-16` … `-512`) | **The mark.** The head and crest crop of the artwork, lines intact. In-app `DevsIcon`/`DevsAnimated`, notification icon/badge, and the master for every blue-plate icon. |
| `naga-ink-black.png` / `naga-ink-white.png` (+ `-512`) | The whole coiled naga exactly as drawn. Large placements only — hero, about, store listing, the OG card. |
| `../favicon.ico`, `../favicon-{16,32,48}x*.png`, `../apple-touch-icon.png`, `../icon-{192,512}*.png` | The white head crop on the AgentAsia blue plate `#6aa1ff`. |
| `../og-cover.png`, `og-agentasia.png` | Social share card (1200×630): the full artwork on `#0b0e14` plus the wordmark. |

Black and white are separate files on purpose: the drawing carries transparent
negative space, so it cannot be recoloured with `currentColor` the way the old
inline SVG could. `Icon.tsx` swaps the two on Tailwind's `dark` class
(`darkMode: 'class'`).

## Rules

1. **No SVG, and no tracing.** The brief rules SVG out, and `public/` contains
   zero `.svg` files. Nothing here is vectorised, and nothing is
   `binary_fill_holes`'d either — an earlier revision filled every enclosed
   region of the drawing and shipped the result as the logo. That destroyed the
   line work that *is* the artwork and produced a blob that read as a different
   animal. `ink` in the generator is the drawing exactly as thresholded, and that
   is the only mark any output may use.
2. **One generator, one direction.** Everything comes from
   `scripts/brand/agentasia-naga-source.jpg` via
   `scripts/brand/generate-brand-assets.py`. Never hand-edit a PNG: edit the
   source or the script and regenerate. `scripts/generate-icons.cjs` is now a
   thin forwarder to that script — it used to be a second, independent sharp
   compositor writing the *same* `icon-192/512` and `apple-touch-icon` files, so
   whichever pipeline ran last silently won and the icons drifted without any
   code change. Do not reintroduce a second writer.
3. **The upstream devs.new mark is not ours.** Neither is the three-round-blob
   shape that replaced it, which was the leftover of the upstream triangle after
   its corners were rounded. It lived as an inline SVG in
   `scripts/generate-icons.cjs`, which is why the tab icon, the home-screen icon,
   the maskable icon and the in-app mark all read as "three dots". That SVG is
   deleted; if you find a round-blob shape anywhere, it is stale.
4. **The source artwork is the owner's.** The earlier style reference was a stock
   render of Thai naga line art, and stock renders carry licences — this repo is
   destined for a public release and a judged submission. The current source is a
   Gemini-generated image the project owner supplied on 2026-09-30 specifically to
   be the AgentAsia mark.

## Why there are two crops, and one threshold

The source is a 2750×1536 black-on-white line drawing. Measured on the Otsu
threshold (131, ink coverage 0.065), a distance transform over the ink gives a
median stroke **half**-width of 2.2 source px, so a full stroke is ~4.4 px. The
head crop is 480 px wide, so at an output size of `S` its strokes land at
`4.4 × S / 480` px:

| Output | Stroke width | What it looks like |
|---|---|---|
| 512 px | 4.7 px | the artwork, clearly |
| 192 px | 1.8 px | fine but correct — this is the app icon |
| 48 px | 0.44 px | below one pixel; the mass reads, the lines do not |
| 16 px | 0.15 px | averaging erases the lines entirely |

So the generator picks by measurement, not by taste:

* **≥ 64 px** — LANCZOS of the alpha field, i.e. the drawing as drawn.
* **< 64 px** — the *thresholded mass* of that same LANCZOS field at
  `SMALL_INK_THRESHOLD = 0.23`, feathered 0.4 px. This is the head's overall
  silhouette rather than its interior lines, because at 16 px interior lines are
  physically unrepresentable.

Measured mark fraction on the plate after this change: **0.281 at 16 px, 0.257 at
32, 0.208 at 48**, and ~0.10 at 180/192/512 where the real line art survives. The
three-dot mark this replaces measured 0.332 / 0.299 / 0.282 at 16 / 32 / 48, so
the tab icon keeps the same visual weight and no layout shifted.

The previous revision used a coverage-preserving max-pool below 64 px instead.
With a 1024 master that means a 64×64 block lights up if the artwork touches it
at all, which measured 0.40 coverage at 16 px — a solid blob. Thresholding the
average, not pooling the maximum, is what fixed it.

`naga-head-*` is used for small placements rather than the full body precisely
because the body is 1650 px of drawing: squeezed to 16 px its strokes are
sub-pixel *and* its outline is too small a fraction of the canvas to hold any
weight.

## Verified

`bun run build` succeeds; every generated locale page (`dist/<lang>/index.html`)
emits the `.ico` + PNG icon links and the `agentasia.vercel.app` canonical.
`favicon.ico` carries real PNG payloads at 16/32/48 (written by `write_ico`, not
Pillow's ICO encoder, which would resample everything from one master). Maskable
icons keep the mark inside the 80% safe zone (set at 0.60 of the plate).
