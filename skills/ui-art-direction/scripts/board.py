#!/usr/bin/env python3
"""Build a contact sheet of image versions (v1..vN) with a label above each, for side-by-side comparison.

Every image is scaled to the same width and keeps its aspect ratio. Labels default to v1..vN; a short
--labels list is completed with the default names, so no image is dropped. Prints the output path.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import fail, font, is_image_path  # noqa: E402

from PIL import Image, ImageDraw  # noqa: E402

BACKGROUND, TEXT = "#111214", "#E6E6E6"
PAD, LABEL_H, LABEL_SIZE = 24, 44, 22


def build_board(paths: list, labels: list[str] | None, cols: int | None, width: int):
    """Return the sheet as a PIL Image. `cols` defaults to min(N, 3) and is capped at N."""
    paths = [Path(p) for p in paths]
    if not paths:
        raise ValueError("at least one image is required")
    if width < 1:
        raise ValueError(f"width must be a positive number of pixels, got {width}")
    if cols is not None and cols < 1:
        raise ValueError(f"cols must be at least 1, got {cols}")
    names = [f"v{i + 1}" for i in range(len(paths))]
    for i, label in enumerate((labels or [])[:len(paths)]):
        names[i] = label.strip()
    cols = min(cols or 3, len(paths))

    thumbs = []
    for p in paths:
        try:
            with Image.open(p) as src:
                im = src.convert("RGB")
        except OSError as e:  # unreadable or truncated; name the file
            raise OSError(f"could not read image {p}: {e}") from e
        thumbs.append(im.resize((width, max(1, round(im.height * width / im.width)))))
    h = max(t.height for t in thumbs)
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (width + PAD) + PAD, rows * (h + LABEL_H + PAD) + PAD), BACKGROUND)
    draw, fnt = ImageDraw.Draw(sheet), font(LABEL_SIZE)
    for i, (t, label) in enumerate(zip(thumbs, names)):
        x = PAD + (i % cols) * (width + PAD)
        y = PAD + (i // cols) * (h + LABEL_H + PAD)
        draw.text((x, y), label, fill=TEXT, font=fnt)
        sheet.paste(t, (x, y + LABEL_H))
    return sheet


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("images", nargs="+", help="images in display order")
    ap.add_argument("--out", required=True, help="output PNG")
    ap.add_argument("--labels", help="comma-separated labels, default v1..vN")
    ap.add_argument("--cols", type=int, help="columns, default min(N, 3)")
    ap.add_argument("--width", type=int, default=640, help="width of each thumbnail in pixels (default 640)")
    args = ap.parse_args(argv)

    out = Path(args.out)
    if not is_image_path(out):
        return fail(f"--out needs an image extension such as .png, got {out}", 2)
    missing = [p for p in args.images if not Path(p).is_file()]
    if missing:
        return fail("image not found: " + ", ".join(missing), 2)
    labels = args.labels.split(",") if args.labels else None
    try:
        sheet = build_board(args.images, labels, args.cols, args.width)
    except (OSError, ValueError) as e:  # OSError covers unreadable and truncated images
        return fail(f"bad input: {e}", 2)
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(out)
    except (OSError, ValueError) as e:
        return fail(f"could not write {out}: {e}", 1)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
