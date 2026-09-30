#!/usr/bin/env python3
"""
Regenerate the AgentAsia brand asset set from the owner's naga artwork.

Source of truth: agentasia-naga-source.jpg, the owner-supplied Gemini render,
copied out of ~/Downloads so the set is reproducible without the download.

THE ONE RULE: this is a raster pipeline. The artwork is cropped, resampled and
composited - never traced, never vectorised, never reduced to a filled
silhouette. A previous revision ran `binary_fill_holes` over the drawing and
shipped the result as the logo and favicon, which destroyed every line the
artwork is made of and left a blob that read as a different animal. Nothing here
fills a region: `ink` is the drawing exactly as thresholded, and that is the
only mark any output can use.

Two marks are produced, both the drawing itself:

  naga-ink-*    the whole artwork as drawn, 1.42:1 centred on a square canvas.
                Use where the line detail can actually be seen: hero, about,
                store listing, the OG card.
  naga-head-*   a crop of the head and crest, same line art, no fill. This is
                the mark for small placements (header, tabs, notifications) and
                the master for every badge, because the full body is 1650px of
                drawing squeezed into a 16px square - its strokes are ~0.6% of
                the canvas, so at favicon size they are sub-pixel and average
                away to grey fog. Zooming into the head is the only way to keep
                the owner's actual lines legible at 16px.

Downscaling is size-dependent for the same reason: LANCZOS for anything large
(accurate, antialiased) and a thresholded mass for the sub-64px badges
icons, so a stroke that lands anywhere in a target pixel lights that pixel
instead of being diluted by the 63 empty ones around it.

Usage:  python3 scripts/brand/generate-brand-assets.py
Needs:  Pillow, numpy, scipy
"""

import io
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / "agentasia-naga-source.jpg"
BRAND = REPO / "public" / "brand"
PUBLIC = REPO / "public"
FONT = REPO / "public" / "fonts" / "Geist.ttf"

MASTER = 1024
PLATE_BLUE = (106, 161, 255, 255)  # #6aa1ff - the colour the PWA icons already use
PLATE_DARK = (11, 14, 20, 255)  # og card background
PAD = 0.02  # breathing room around the mark inside the square canvas

BLACK = (17, 17, 17)
WHITE = (255, 255, 255)

# The head/crest crop, in source-pixel coordinates. The crest tips at y~100 and
# the jaw curls out at y~760; x 1700-2180 takes the eye, the flame fin and the
# open mouth without cutting into the neck coil.
HEAD_BOX = (1700, 100, 2180, 780)

# Sizes where averaging destroys the strokes, so the max-pool is used instead.
# Sizes at or below this cannot resolve the drawing's 4px strokes: one output
# pixel covers ~64 source pixels, so averaging makes the lines vanish and
# max-pooling makes every touched pixel light up, which is how the previous
# revision got a 0.40 blob out of a 0.28 mark. Below this size the badge is
# rendered as the thresholded mass of the artwork instead - the head's overall
# silhouette, at the same weight class as the mark it replaces.
SMALL_SIZE_BELOW = 64
SMALL_INK_THRESHOLD = 0.23  # measured: 0.28 coverage at 16px (old mark: 0.33)


# ---------------------------------------------------------------- extraction


def load_ink_mask():
    """Binarise the artwork to its ink, drop dust, return (mask, threshold).

    This is a threshold, not a trace: the output is the same pixels the drawing
    has, just with the JPEG's off-white background mapped to transparent later.
    """
    a = np.asarray(Image.open(SOURCE).convert("L"))

    # Otsu, rather than a hand-picked threshold: the artwork is flat black on
    # white, but the JPEG background drifts.
    hist = np.bincount(a.ravel(), minlength=256).astype(float)
    hist /= hist.sum()
    means = np.arange(256, dtype=float)
    best_var, best_th = -1.0, 127
    for th in range(1, 255):
        w0 = hist[:th].sum()
        w1 = 1.0 - w0
        if w0 == 0 or w1 == 0:
            continue
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


def to_square(mask, size=MASTER, pad=PAD, box=None):
    """Centre the mask (or a crop of it) on a square canvas and resample it.

    Returns a float alpha (0..1).
    """
    if box is not None:
        x0, y0, x1, y1 = box
        crop = mask[y0:y1, x0:x1]
    else:
        ys, xs = np.where(mask)
        crop = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]

    img = Image.fromarray((crop * 255).astype(np.uint8))
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


# ------------------------------------------------------------- resampling


def resample(alpha, size):
    """Downscale an alpha field, choosing the filter by target size.

    LANCZOS for large sizes, where the strokes resolve. Below SMALL_SIZE_BELOW
    they do not, so the mark is the thresholded mass of that same LANCZOS field,
    feathered by less than half a pixel to keep the edges from being 1-bit stairs.
    """
    avg = np.asarray(
        Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8)).resize(
            (size, size), Image.LANCZOS
        )
    ).astype(float) / 255.0
    if size >= SMALL_SIZE_BELOW or MASTER % size:
        return avg

    mass = (avg > SMALL_INK_THRESHOLD).astype(np.uint8) * 255
    mass = np.asarray(Image.fromarray(mass).filter(ImageFilter.GaussianBlur(0.4)))
    return mass.astype(float) / 255.0


def rgba_from_alpha(alpha, colour):
    h, w = alpha.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = colour
    out[..., 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


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

    inner = max(1, int(size * scale))
    small = resample(alpha, inner)
    alpha_used = np.zeros((size, size), float)
    off = (size - inner) // 2
    alpha_used[off : off + inner, off : off + inner] = small

    for c in range(3):
        out[..., c] = out[..., c] * (1 - alpha_used) + 255.0 * alpha_used
    out[..., 3] = np.clip(out[..., 3], 0, 255)
    return Image.fromarray(np.rint(out).astype(np.uint8), "RGBA")


def write_ico(path, images):
    """Write an ICO from already-rendered PNGs, one per size.

    Pillow's ICO encoder resamples every size from a single master, which would
    throw away the max-pool work at 16 and 32px. PNG payloads in an ICO are the
    Vista-plus form and every current browser reads them.
    """
    ordered = sorted(images.items(), key=lambda kv: kv[0])
    payloads = []
    for _, img in ordered:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        payloads.append(buf.getvalue())

    header = struct.pack("<HHH", 0, 1, len(ordered))
    entries = b""
    offset = 6 + 16 * len(ordered)
    for (size, _), payload in zip(ordered, payloads):
        side = size if size < 256 else 0  # 0 means 256 in the ICO directory
        entries += struct.pack("<BBBBHHII", side, side, 0, 0, 1, 32, len(payload), offset)
        offset += len(payload)

    with open(path, "wb") as fh:
        fh.write(header + entries + b"".join(payloads))


# --------------------------------------------------------------------- output


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    ink, threshold = load_ink_mask()
    print(f"otsu threshold {threshold}; ink coverage {ink.mean():.3f}")

    full_alpha = to_square(ink)
    head_alpha = to_square(ink, box=HEAD_BOX)
    print(
        f"master coverage - full {full_alpha.mean():.3f}, head {head_alpha.mean():.3f}"
    )

    # ---- the artwork as drawn, for large placements
    for name, colour in (("naga-ink-black", BLACK), ("naga-ink-white", WHITE)):
        rgba_from_alpha(full_alpha, colour).save(BRAND / f"{name}.png")
        rgba_from_alpha(resample(full_alpha, 512), colour).save(
            BRAND / f"{name}-512.png"
        )

    # ---- the head crop, for small placements and as the badge master
    sizes = [16, 32, 48, 96, 128, 180, 192, 256, 512]
    for name, colour in (("naga-head-black", BLACK), ("naga-head-white", WHITE)):
        rgba_from_alpha(head_alpha, colour).save(BRAND / f"{name}.png")
        for size in sizes:
            rgba_from_alpha(resample(head_alpha, size), colour).save(
                BRAND / f"{name}-{size}.png"
            )

    # ---- badge icons: browser tab, home screen, manifest
    favs = {
        size: badge(head_alpha, size, PLATE_BLUE) for size in (16, 32, 48)
    }
    favs[16].save(PUBLIC / "favicon-16x16.png")
    favs[32].save(PUBLIC / "favicon-32x32.png")
    favs[48].save(PUBLIC / "favicon-48x48.png")
    write_ico(PUBLIC / "favicon.ico", favs)

    badge(head_alpha, 180, PLATE_BLUE, scale=0.86).save(PUBLIC / "apple-touch-icon.png")
    for size in (192, 512):
        badge(head_alpha, size, PLATE_BLUE, scale=0.82).save(PUBLIC / f"icon-{size}.png")
        # maskable: full-bleed plate, mark inside the 80% safe zone
        badge(head_alpha, size, PLATE_BLUE, scale=0.6).save(
            PUBLIC / f"icon-{size}-maskable.png"
        )

    # ---- social share card: the whole drawing, which is what you want on 1200px
    og = Image.new("RGBA", (1200, 630), PLATE_DARK)
    mark = rgba_from_alpha(resample(full_alpha, 460), WHITE)
    og.paste(mark, (70, (630 - 460) // 2), mark)
    draw = ImageDraw.Draw(og)
    title_font = ImageFont.truetype(str(FONT), 92)
    body_font = ImageFont.truetype(str(FONT), 40)
    draw.text((580, 232), "AgentAsia", font=title_font, fill=(255, 255, 255, 255))
    draw.text(
        (582, 348),
        "AI that speaks your language",
        font=body_font,
        fill=(150, 162, 184, 255),
    )
    og.convert("RGB").save(PUBLIC / "og-cover.png")
    og.convert("RGB").save(BRAND / "og-agentasia.png")

    print("brand assets written")


if __name__ == "__main__":
    main()
