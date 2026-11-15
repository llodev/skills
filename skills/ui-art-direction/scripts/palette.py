#!/usr/bin/env python3
"""Extract the dominant palette of an image and suggest color roles, with WCAG contrast ratios.

Roles are suggestions for a person or agent to review:
  background        the most frequent color
  foreground        the visible color with the highest contrast against the background
  accent            the most chromatic color that reads on the background (contrast >= 3) and is not the text
  surface           the color closest in lightness to the background
  muted-foreground  the color whose contrast against the background is closest to 4.6

A near-monochrome image has no distinct accent: the accent then equals the foreground and `notes` says so.
Prints JSON {roles, contrast, notes}. With --out, also writes the full JSON (with every swatch) and a
sibling .css file of custom properties. With --swatch, writes a strip of the top swatches.
"""
from __future__ import annotations

import argparse
import colorsys
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import contrast, fail, font, hex_of, is_image_path  # noqa: E402

from PIL import Image, ImageDraw  # noqa: E402

MIN_SHARE = 0.001  # below this a color is compression noise
ACCENT_MAX_SHARE, ACCENT_MIN_CHROMA, ACCENT_MIN_CONTRAST = 0.25, 0.15, 3.0
MUTED_TARGET_CONTRAST = 4.6
NOTE_MONOCHROME = ("no distinct accent color: the image is nearly monochrome, so the accent was set to the "
                   "foreground; pick one by hand if you need it")
NOTE_FLAT = ("only one color found: every role is that color and the contrast checks are meaningless; "
             "pick the roles by hand")


def _chroma(sw: dict) -> float:
    return (max(sw["rgb"]) - min(sw["rgb"])) / 255


def analyze(image_path, colors: int = 24) -> dict:
    """Quantize the image (octree, which keeps rare extremes such as light text and bright accents better
    than median cut) and return {source, swatches, roles, contrast, notes}."""
    if not 1 <= colors <= 256:
        raise ValueError(f"colors must be between 1 and 256, got {colors}")
    with Image.open(image_path) as src:
        im = src.convert("RGB")
    im.thumbnail((800, 800))
    q = im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    swatches = []
    for count, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
        swatches.append({"hex": hex_of(rgb), "rgb": list(rgb), "share": round(count / total, 4),
                         "lightness": round(l, 3), "saturation": round(s, 3), "hue": round(h * 360)})

    bg = swatches[0]
    visible = [s for s in swatches if s["share"] >= MIN_SHARE]
    ink = max(visible, key=lambda s: contrast(s["rgb"], bg["rgb"]))
    accent_pool = [s for s in visible if s is not ink and s["share"] < ACCENT_MAX_SHARE
                   and _chroma(s) >= ACCENT_MIN_CHROMA and contrast(s["rgb"], bg["rgb"]) >= ACCENT_MIN_CONTRAST]
    accent = max(accent_pool, key=_chroma) if accent_pool else ink
    notes = []
    if len(visible) == 1:
        notes.append(NOTE_FLAT)
    if not accent_pool:
        notes.append(NOTE_MONOCHROME)
    rest = [s for s in visible if s is not bg and s is not ink and s is not accent]
    surface = min(rest, key=lambda s: abs(s["lightness"] - bg["lightness"]) + (0 if s["lightness"] != bg["lightness"] else 1),
                  default=bg)
    muted = min(rest, key=lambda s: abs(contrast(s["rgb"], bg["rgb"]) - MUTED_TARGET_CONTRAST), default=ink)
    roles = {"background": bg["hex"], "surface": surface["hex"], "foreground": ink["hex"],
             "muted-foreground": muted["hex"], "accent": accent["hex"]}
    checks = {
        "foreground/background": round(contrast(ink["rgb"], bg["rgb"]), 2),
        "muted/background": round(contrast(muted["rgb"], bg["rgb"]), 2),
        "accent/background": round(contrast(accent["rgb"], bg["rgb"]), 2),
    }
    return {"source": str(image_path), "swatches": swatches, "roles": roles, "contrast": checks, "notes": notes}


def css_of(roles: dict) -> str:
    return ":root {\n" + "".join(f"  --{k}: {v};\n" for k, v in roles.items()) + "}\n"


def swatch_strip(swatches: list[dict]):
    shown = [s for s in swatches if s["share"] >= MIN_SHARE][:16]
    sw = Image.new("RGB", (80 * len(shown), 120), "white")
    d, fnt = ImageDraw.Draw(sw), font(12)
    for i, s in enumerate(shown):
        d.rectangle([i * 80, 0, i * 80 + 79, 90], fill=s["hex"])
        d.text((i * 80 + 4, 96), s["hex"], fill="black", font=fnt)
    return sw


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", help="source image, usually the approved mockup")
    ap.add_argument("--colors", type=int, default=24, help="palette size for quantization, 1-256 (default 24)")
    ap.add_argument("--out", help="write the full JSON here and a sibling .css file")
    ap.add_argument("--swatch", help="write a PNG strip of the top swatches here")
    args = ap.parse_args(argv)

    if args.out and Path(args.out).suffix.lower() == ".css":
        return fail(f"--out is the JSON path; the CSS file is written beside it (got {args.out})", 2)
    if args.swatch and not is_image_path(args.swatch):
        return fail(f"--swatch needs an image extension such as .png, got {args.swatch}", 2)
    src = Path(args.image)
    if not src.is_file():
        return fail(f"image not found: {src}", 2)
    try:
        result = analyze(src, args.colors)
    except OSError as e:  # unreadable or truncated image
        return fail(f"bad input: could not read image {src}: {e}", 2)
    except ValueError as e:
        return fail(f"bad input: {e}", 2)
    summary = {k: result[k] for k in ("roles", "contrast", "notes")}
    try:
        if args.out:
            out = Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            out.with_suffix(".css").write_text(css_of(result["roles"]), encoding="utf-8")
        if args.swatch:
            swatch = Path(args.swatch)
            swatch.parent.mkdir(parents=True, exist_ok=True)
            swatch_strip(result["swatches"]).save(swatch)
    except (OSError, ValueError) as e:
        return fail(f"could not write output: {e}", 1)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
