# Brand mark — provenance and rules

## What is here

| File | Use |
|---|---|
| `naga-solid-black.png` / `naga-solid-white-*.png` | **The mark.** Favicons, app icon, in-app `DevsIcon`/`DevsAnimated`, notification icon/badge, PWA manifest. Sizes 16–512. |
| `naga-ink-black.png` / `naga-ink-white.png` | The same artwork as line art. Large placements only (hero, about, store listing). Do **not** use below ~128px. |
| `../og-cover.png`, `og-agentasia.png` | Social share card (1200×630), built from the solid mark. |

Black and white are separate files on purpose: the mark carries transparent
negative space, so it cannot be recoloured with `currentColor` the way the old
inline SVG could. `Icon.tsx` swaps the two on Tailwind's `dark` class
(`darkMode: 'class'`).

## Rules

1. **No SVG.** The brief rules it out, and `public/` contains zero `.svg`
   files. Every brand asset here is PNG/ICO. Do not re-add them.
2. **One mark, one source.** Everything is generated from
   `scripts/brand/agentasia-naga-source.jpg` by
   `scripts/brand/generate-brand-assets.py`. Never hand-edit a PNG: edit the
   source or the script and regenerate. `scripts/generate-icons.cjs` composes the
   blue-plate icons from the generated master, so it must run **after** the
   Python script.
3. **The upstream devs.new mark is not ours.** Neither is the three-round-blob
   shape that replaced it. That blob was the leftovers of the upstream triangle
   after the corners were rounded, and it lived as an inline SVG in
   `scripts/generate-icons.cjs` — which is why the tab icon, the home-screen
   icon, the PWA maskable icon and the in-app mark all read as "three dots".
   That SVG is deleted. If you find a round-blob shape anywhere, it is stale.
4. **Do not reuse the reference artwork.** The style reference for the earlier
   mark was a stock render of Thai naga line art. Stock renders carry a licence;
   this repo is destined for a **public MIT** release and a judged submission.
   The current source is a Gemini-generated image owned by the project owner,
   supplied on 2026-09-30 specifically to be the AgentAsia mark.

## The two weights, and why both

The source is a wide-format (1651×1165 px) black-on-white line drawing. Its
strokes are ~17 px wide in the source, i.e. ~10 px in a 1024 master — which
means **0.16 px at 16px**, where a pixel is the smallest unit there is. Used as
drawn, the mark vanishes in a browser tab.

So the generator emits two weights, and code picks between them by size, not by
taste:

| Variant | How | Ink coverage at 1024 / 96 / 48 / 32 / 16 |
|---|---|---|
| `naga-ink` | the drawing as-is | 0.086 / — / — / — / — |
| `naga-solid` | small gaps closed, every enclosed region filled | 0.311 / 0.310 / 0.310 / 0.310 / 0.301 |

The previous mark measured 0.253 at 1024 and 0.332 / 0.282 / 0.299 at 16 / 48 /
32 — the same weight class, which is why nothing in the layout shifted when it
was swapped. Dilating the solid mark further was measured and rejected: one
iteration at 16px raises coverage to 0.570 and turns the favicon into an
amorphous block.

The blue-plate icons (`favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`
and their maskable variants) put `naga-solid-white` on `#6aa1ff` — the plate
colour those icons already used — so they stay legible in both light and dark
browser chrome, which a black-on-transparent PNG is not.

## Verified

`bun run build` succeeds; every generated locale page (`dist/<lang>/index.html`)
emits the `.ico` + PNG icon links and the `agentasia.vercel.app` canonical.
`favicon.ico` carries 16/32/48. Maskable icons keep the mark inside the 80%
safe zone (set at 0.60 of the plate).
