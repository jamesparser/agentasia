#!/usr/bin/env python3
"""
Regenerate the whole AgentAsia brand asset set from the naga artwork.

Source of truth: agentasia-naga-source.jpg (the owner-supplied Gemini render,
copied out of ~/Downloads so the set is reproducible without the download).

Two marks are produced, exactly as before:

  naga-ink-*.png     the line art as drawn. ~10% ink coverage. Large placements
                     only (hero, about, store listing) - it is a whisper at 16px.
  naga-solid-*.png   the same drawing with its enclosed regions filled, i.e. the
                     silhouette mass. ~37% coverage, which is what the old bold
                     mark measured, so it keeps the favicon readable.

and the badge icons (favicon.ico, apple-touch-icon, PWA icons), which are the
solid mark in white on the AgentAsia blue plate.

Black and white variants are separate files because the mark carries
transparent negative space and cannot be recoloured with `currentColor`.

Usage:  python3 scripts/brand/generate-brand-assets.py
Needs:  Pillow, numpy, scipy
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / "agentasia-naga-source.jpg"
BRAND = REPO / "public" / "brand"
PUBLIC = REPO / "public"
FONT = REPO / "public" / "fonts" / "Geist.ttf"

MASTER = 1024
PLATE_BLUE = (106, 161, 255, 255)  # #6aa1ff - the colour the PWA icons already use
PLATE_DARK = (11, 14, 20, 255)  # og card background
PAD = 0.04  # breathing room around the mark inside the square canvas


# ---------------------------------------------------------------- extraction


def load_ink_mask():
    """Binarise the artwork to its ink, drop dust, return (mask, threshold)."""
    a = np.asarray(Image.open(SOURCE).convert("L"))

    # Otsu, rather than a hand-picked threshold: the artwork is flat black on
    # white, but the JPEG background drifts.
    hist = np.bincount(a.ravel(), minlength=256).astype(float)
    hist /= hist.sum()
    best_var, best_th = -1.0, 127
    for th in range(1, 255):
        w0 = hist[:th].sum()
        w1 = 1.0 - w0
        if w0 == 0 or w1 == 0:
            continue
        means = np.arange(256, dtype=float)
        m0 = (means[:th] * hist[:th]).sum() / w0
        m1 = (means[th:] * hist[th:]).sum() / w1
        var = w0 * w1 * (m0 - m1) ** 2
        if var > best_var:
            best_var, best_th = var, th

    ink = a < best_th
    labels, count = ndimage.label(ink)
    if count > 1:
        keep = [i for i in range(1, count + 1) if (labels == i).sum() > 500]
        ink = np.isin(labels, keep)
    return ink, best_th


def to_square(mask, size, pad=PAD):
    """Centre the mask's bounding box on a square canvas and resample it.

    Returns a float alpha (0..1): coverage, antialiased by LANCZOS.
    """
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    crop = (mask[y0 : y1 + 1, x0 : x1 + 1] * 255).astype(np.uint8)
    img = Image.fromarray(crop)

    w, h = img.size
    side = max(w, h)
    canvas = Image.new("L", (side, side), 0)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)

    alpha = np.asarray(canvas).astype(float) / 255.0
    inset = int(size * pad)
    inner_h = size - 2 * inset
    inner = np.asarray(
        Image.fromarray((alpha * 255).astype(np.uint8)).resize(
            (inner_h, inner_h), Image.LANCZOS
        )
    ).astype(float) / 255.0
    out = np.zeros((size, size), float)
    out[inset : inset + inner_h, inset : inset + inner_h] = inner
    return out


def fill_mass(ink):
    """Close small gaps, then fill every enclosed region: the silhouette mass."""
    closed = ndimage.binary_closing(ink, structure=np.ones((5, 5)))
    return ndimage.binary_fill_holes(closed)


# --------------------------------------------------------------------- output


def rgba_from_alpha(alpha, colour):
    h, w = alpha.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = colour
    out[..., 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def thicken(alpha, radius):
    """Dilate a mark so thin strokes survive being downscaled.

    Measured, not guessed: the filled mass already lands at 0.289/0.300/0.298
    coverage at 16/32/48px - the old bold silhouette measured 0.332/0.299/0.282 -
    so the solid mark ships with radius 0. One iteration at 16px pushes coverage
    to 0.570 and turns the favicon into an amorphous block, which is the failure
    mode this function exists to prevent, not cause. Only the line-art mark is
    thickened, and only at 512px, where its 8% ink coverage would otherwise be a
    whisper.
    """
    if radius <= 0:
        return alpha
    mask = alpha > 0.5
    grown = ndimage.binary_dilation(mask, structure=np.ones((3, 3)), iterations=radius)
    return ndimage.gaussian_filter(grown.astype(float), 0.5)


def rescale_alpha(alpha, size):
    return np.asarray(
        Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8)).resize(
            (size, size), Image.LANCZOS
        )
    ).astype(float) / 255.0


def badge(alpha, size, plate, scale=1.0, radius_pct=0.0):
    """The mark in white on a filled plate, optionally with rounded corners."""
    base = np.zeros((size, size, 4), np.uint8)
    base[..., 0], base[..., 1], base[..., 2] = plate[:3]
    base[..., 3] = 255

    plate_img = Image.fromarray(base, "RGBA")
    if radius_pct:
        r = int(size * radius_pct)
        corner_mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(corner_mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=r, fill=255
        )
        plate_img.putalpha(corner_mask)

    out = np.asarray(plate_img).astype(np.float64)

    if scale != 1.0:
        inner = max(1, int(size * scale))
        small = rescale_alpha(alpha, inner)
        # pad the mark back out to the plate size so it sits centred
        pad_img = np.zeros((size, size), float)
        off = (size - inner) // 2
        pad_img[off : off + inner, off : off + inner] = small
        alpha_used = pad_img
    else:
        alpha_used = rescale_alpha(alpha, size)

    for c in range(3):
        out[..., c] = out[..., c] * (1 - alpha_used) + 255.0 * alpha_used
    out[..., 3] = np.clip(out[..., 3], 0, 255)
    return Image.fromarray(np.rint(out).astype(np.uint8), "RGBA")


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    ink, threshold = load_ink_mask()
    mass = fill_mass(ink)
    print(
        f"otsu threshold {threshold}; ink {ink.mean():.3f}; filled mass {mass.mean():.3f}"
    )

    ink_alpha = to_square(ink, MASTER)
    mass_alpha = to_square(mass, MASTER)
    print(
        f"master ink coverage {ink_alpha.mean():.3f}; master mass {mass_alpha.mean():.3f}"
    )

    black = (17, 17, 17)
    white = (255, 255, 255)

    # ---- detailed line art: large placements (one step of stroke thickening so
    # the 512 render does not turn into a ghost)
    for name, colour in (("naga-ink-black", black), ("naga-ink-white", white)):
        rgba_from_alpha(ink_alpha, colour).save(BRAND / f"{name}.png")
        rgba_from_alpha(thicken(ink_alpha, 1), colour).save(BRAND / f"{name}-512.png")

    # ---- solid mass: favicons, in-app mark, manifest sources
    sizes = [16, 32, 48, 96, 128, 180, 192, 256, 512]
    for name, colour in (("naga-solid-black", black), ("naga-solid-white", white)):
        rgba_from_alpha(mass_alpha, colour).save(BRAND / f"{name}.png")
        for size in sizes:
            alpha = rescale_alpha(mass_alpha, size)
            rgba_from_alpha(alpha, colour).save(BRAND / f"{name}-{size}.png")

    # ---- badge icons: browser tab, home screen, manifest
    fav16 = badge(mass_alpha, 16, PLATE_BLUE, radius_pct=0.0)
    fav32 = badge(mass_alpha, 32, PLATE_BLUE, radius_pct=0.0)
    fav48 = badge(mass_alpha, 48, PLATE_BLUE, radius_pct=0.0)
    fav16.save(PUBLIC / "favicon-16x16.png")
    fav32.save(PUBLIC / "favicon-32x32.png")
    fav48.save(PUBLIC / "favicon-48x48.png")

    # The ICO encoder resamples from this master, so it carries 16/32/48 cleanly.
    badge(mass_alpha, 256, PLATE_BLUE, radius_pct=0.0).save(
        PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )

    badge(mass_alpha, 180, PLATE_BLUE, scale=0.86).save(PUBLIC / "apple-touch-icon.png")
    for size in (192, 512):
        badge(mass_alpha, size, PLATE_BLUE, scale=0.82).save(PUBLIC / f"icon-{size}.png")
        # maskable: full-bleed plate, mark inside the 80% safe zone
        badge(mass_alpha, size, PLATE_BLUE, scale=0.6).save(
            PUBLIC / f"icon-{size}-maskable.png"
        )

    # ---- social share card
    og = Image.new("RGBA", (1200, 630), PLATE_DARK)
    mark = badge(mass_alpha, 320, PLATE_BLUE, scale=0.8)
    og.paste(mark, (84, (630 - 320) // 2), mark)
    draw = ImageDraw.Draw(og)
    title_font = ImageFont.truetype(str(FONT), 92)
    body_font = ImageFont.truetype(str(FONT), 40)
    draw.text((476, 232), "AgentAsia", font=title_font, fill=(255, 255, 255, 255))
    draw.text(
        (478, 348),
        "AI that speaks your language",
        font=body_font,
        fill=(150, 162, 184, 255),
    )
    og.convert("RGB").save(PUBLIC / "og-cover.png")
    og.convert("RGB").save(BRAND / "og-agentasia.png")

    print("brand assets written")


if __name__ == "__main__":
    main()
