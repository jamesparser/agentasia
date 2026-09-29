# Brand mark — provenance and rules

## What is here

| File | Use |
|---|---|
| `naga-bold-black.png` / `naga-bold-white-*.png` | **The mark.** Favicons, app icon, in-app `DevsIcon`/`DevsAnimated`, notification icon/badge, PWA manifest. Sizes 16–512. |
| `naga-detailed-black.png` / `-white.png` | Large placements only (hero, about, store listing). Do **not** use below ~128px. |
| `../og-cover.png` | Social share card (1200×630), built from the bold mark. |

Black and white are separate files on purpose: the mark carries transparent
negative space (eye, mouth, crest), so it cannot be recoloured with
`currentColor` the way the old inline SVG could. `Icon.tsx` swaps the two on
Tailwind's `dark` class (`darkMode: 'class'`).

## Rules

1. **No SVG.** The brief rules it out, and `public/` now contains zero `.svg`
   files. Every brand asset here is PNG/ICO. `favicon.svg`, `devs.svg`,
   `devs-static.svg`, `naga-logo.svg` and `agents/devs.svg` were deleted — do not
   re-add them.
2. **The upstream devs.new triangle is not ours.** It was used as the favicon, the
   hero mark, the loader, the progress indicator, the tour, the PWA maskable icon,
   the notification icon and the `<meta name="author">`. All of those now point at
   the naga.
3. **Do not reuse the reference artwork.** The style reference was a stock render
   of Thai naga line art. Stock renders carry a licence; this repo is destined for
   a **public MIT** release and a judged submission, so shipping it would be a real
   copyright liability, and as a JPEG of a vector it has hairline strokes that
   collapse at 16px. It was used **only** as a style reference — no pixels from it
   are in this repository.

## How the mark was made

`orig` form came from an image model (Flux) prompted for a coiled naga. Its first
output was judged correct in shape but wrong in style — "shaded and illustrative,
not clean bold line art… 3/10, will not read at 16px". So the *shape* was kept and
the *rendering* discarded: the image was thresholded to its largest connected mass,
holes filled, then morphologically opened to erase the detail that turns to mud at
favicon size. Result is a flat single-colour silhouette.

Two candidates were reviewed by a vision model on a contact sheet at 16/32/48/128px:
detailed silhouette `6/10`, bold silhouette `8/10`, recommendation `SHIP-BOTTOM`
(i.e. the bold one) in both runs. The bold variant is what ships as `logo`.

Reproducible from the scripts in `~/tmp/naga/` (`to_silhouette.py`); regenerable at
any size from the 1024px masters.

## Verified

`bun run build` succeeds; every generated locale page (`dist/<lang>/index.html`)
emits the `.ico` + PNG icon links and the `agentasia.vercel.app` canonical.
