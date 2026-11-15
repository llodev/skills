#!/usr/bin/env python3
"""Draw a gray wireframe (labeled boxes) from a layout JSON, to use as the layout reference for an image model.

Spec format (x, y, w, h are percentages of the frame; boxes past the frame are clamped to it):

  {"size": [1920, 1080], "boxes": [
    {"x": 0, "y": 0, "w": 18, "h": 100, "label": "sidebar: navigation + history"},
    {"x": 18, "y": 0, "w": 82, "h": 10, "label": "top bar: conversation title"}
  ]}

"size" defaults to [1920, 1080]. Give it the same aspect as the --aspect used to generate the mockups
(16:9 first, e.g. 1920x1080; 1:1 as 1080x1080; 9:16 as 1080x1920), or the model re-proportions the layout.
Boxes carry no color, only structure: the image model copies the arrangement, not the style.
Prints the output path.
"""
from __future__ import annotations

import argparse
import json
import sys
from numbers import Real
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import fail, font, is_image_path  # noqa: E402

from PIL import Image, ImageDraw  # noqa: E402

PAGE, FILL, OUTLINE, INK = "#F2F2F0", "#DCDCD8", "#A9A9A4", "#5C5C58"
DEFAULT_SIZE = (1920, 1080)
INSET, RADIUS, BORDER = 6, 14, 3
LABEL_X, LABEL_Y, LABEL_MARGIN, LINE_SPACING = 22, 18, 44, 6


def wrap_label(draw, label: str, font, max_width: float) -> list[str]:
    """Greedy word wrap. A line only exceeds `max_width` when it is a single word that cannot be split."""
    lines: list[str] = []
    line = ""
    for word in label.split():
        trial = f"{line} {word}".strip()
        if line and draw.textlength(trial, font=font) > max_width:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def _size(spec: dict) -> tuple[int, int]:
    size = spec.get("size", DEFAULT_SIZE)
    if (not isinstance(size, (list, tuple)) or len(size) != 2
            or not all(isinstance(v, int) and not isinstance(v, bool) and v > 0 for v in size)):
        raise ValueError(f'"size" must be two positive integers [width, height], got {size!r}')
    return size[0], size[1]


def _box(b, i: int) -> tuple[float, float, float, float]:
    if not isinstance(b, dict):
        raise ValueError(f"box {i} must be an object, got {b!r}")
    values = []
    for key in ("x", "y", "w", "h"):
        v = b.get(key)
        if not isinstance(v, Real) or isinstance(v, bool):
            raise ValueError(f'box {i} needs a numeric "{key}" (percent of the frame), got {v!r}')
        values.append(float(v))
    return values[0], values[1], values[2], values[3]


def _clamp(v: float) -> float:
    return min(max(v, 0.0), 100.0)


def render_wireframe(spec: dict):
    """Render the spec to a PIL Image of `spec["size"]`. Raises ValueError on a malformed spec."""
    if not isinstance(spec, dict):
        raise ValueError("the spec must be a JSON object with \"size\" and \"boxes\"")
    W, H = _size(spec)
    boxes = spec.get("boxes", [])
    if not isinstance(boxes, list):
        raise ValueError('"boxes" must be a list')
    parsed = [_box(b, i) for i, b in enumerate(boxes)]

    im = Image.new("RGB", (W, H), PAGE)
    d, fnt = ImageDraw.Draw(im), font(max(14, W // 70))
    for b, (x, y, w, h) in zip(boxes, parsed):
        x0, y0 = _clamp(x) * W / 100, _clamp(y) * H / 100
        x1, y1 = _clamp(x + w) * W / 100, _clamp(y + h) * H / 100
        rx0, ry0, rx1, ry1 = x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET
        if rx1 <= rx0 or ry1 <= ry0:
            continue  # outside the frame or too small to draw
        radius = min(RADIUS, (rx1 - rx0) / 2, (ry1 - ry0) / 2)
        d.rounded_rectangle([rx0, ry0, rx1, ry1], radius=radius, fill=FILL, outline=OUTLINE, width=BORDER)
        label = b.get("label")
        if label:
            lines = wrap_label(d, str(label), fnt, (x1 - x0) - LABEL_MARGIN)
            d.multiline_text((x0 + LABEL_X, y0 + LABEL_Y), "\n".join(lines), fill=INK, font=fnt, spacing=LINE_SPACING)
    return im


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec", help="layout JSON (wire.json)")
    ap.add_argument("--out", required=True, help="output PNG")
    args = ap.parse_args(argv)

    out = Path(args.out)
    if not is_image_path(out):
        return fail(f"--out needs an image extension such as .png, got {out}", 2)
    spec_path = Path(args.spec)
    if not spec_path.is_file():
        return fail(f"spec not found: {spec_path}", 2)
    try:
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
        im = render_wireframe(spec)
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as e:
        return fail(f"invalid spec {spec_path}: {e}", 2)
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out)
    except (OSError, ValueError) as e:
        return fail(f"could not write {out}: {e}", 1)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
