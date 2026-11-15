#!/usr/bin/env python3
"""Compare an approved mockup (REFERENCE) with a screenshot of the implementation, tile by tile.

The implementation is resized to the reference size without cropping; the report says when that happened
(`resized`) and when the aspect ratios differ by more than 2 percent (`aspect_mismatch`). The image is split
into a grid of tiles (columns x rows, counted from 0 at the top left) and each tile gets a score from 0 to 1,
higher is closer. With numpy the score is SSIM on grayscale (longer side at most 1280 px, 7-pixel uniform
window); without numpy it is 1 - mean(|a - b|) / 255 on luminance, and `method` says which one was used.

Writes the sheet (reference, implementation, difference heat map side by side) to --out, saves the worst tiles
as <out stem>-tile-<col>-<row>.png (reference crop beside implementation crop), and prints the JSON report.
The heat map is contrast-stretched: the largest difference is always full red, so near-identical images can
still look hot. Read its shape, not its intensity, and use the scores for magnitude.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import fail, is_image_path  # noqa: E402
from board import build_board  # noqa: E402

from PIL import Image, ImageChops, ImageDraw, ImageOps  # noqa: E402

MAX_SIDE = 1280
WINDOW = 7
C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
ASPECT_TOLERANCE = 0.02
SHEET_MAX_WIDTH, CROP_MIN_WIDTH = 1280, 360
HEAT_LOW, HEAT_HIGH, GRID_LINE, WORST_LINE = "#111214", "#FF4D4D", "#3A3F47", "#FFD60A"


def _open_rgb(path) -> Image.Image:
    try:
        with Image.open(path) as src:
            return src.convert("RGB")
    except OSError as e:  # unreadable or truncated; name the file
        raise OSError(f"could not read image {path}: {e}") from e


def _load_pair(reference, implementation):
    """Open both images as RGB and resize the implementation to the reference size, never cropping."""
    ref, impl = _open_rgb(reference), _open_rgb(implementation)
    resized = impl.size != ref.size
    aspect_mismatch = abs((impl.width / impl.height) / (ref.width / ref.height) - 1) > ASPECT_TOLERANCE
    if resized:
        impl = impl.resize(ref.size, Image.Resampling.LANCZOS)
    return ref, impl, resized, aspect_mismatch


def _tile_boxes(width: int, height: int, cols: int, rows: int) -> list[tuple[int, int, list[int]]]:
    """(col, row, [x0, y0, x1, y1]) for every tile, row by row."""
    return [(c, r, [c * width // cols, r * height // rows, (c + 1) * width // cols, (r + 1) * height // rows])
            for r in range(rows) for c in range(cols)]


def _box_mean(a, np):
    """Mean over a uniform WINDOW x WINDOW window centered on each pixel, edges padded by replication."""
    r = WINDOW // 2
    s = np.pad(np.pad(a, r, mode="edge").cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    k = WINDOW
    return (s[k:, k:] - s[:-k, k:] - s[k:, :-k] + s[:-k, :-k]) / (k * k)


def _ssim_scorer(ga: Image.Image, gb: Image.Image, np):
    a, b = np.asarray(ga, dtype=np.float64), np.asarray(gb, dtype=np.float64)
    mu_a, mu_b = _box_mean(a, np), _box_mean(b, np)
    var_a = _box_mean(a * a, np) - mu_a ** 2
    var_b = _box_mean(b * b, np) - mu_b ** 2
    cov = _box_mean(a * b, np) - mu_a * mu_b
    ssim = ((2 * mu_a * mu_b + C1) * (2 * cov + C2)) / ((mu_a ** 2 + mu_b ** 2 + C1) * (var_a + var_b + C2))
    return lambda box: float(ssim[box[1]:box[3], box[0]:box[2]].mean())


def _mae_scorer(ga: Image.Image, gb: Image.Image):
    diff = ImageChops.difference(ga, gb)

    def score(box):
        hist = diff.crop(box).histogram()
        return 1 - sum(i * n for i, n in enumerate(hist)) / (255 * sum(hist))
    return score


def _score(ref: Image.Image, impl: Image.Image, resized: bool, aspect_mismatch: bool,
           grid: tuple[int, int], worst: int, use_numpy: bool | None) -> dict:
    cols, rows = grid
    if cols < 1 or rows < 1:
        raise ValueError(f"grid must be at least 1x1, got {cols}x{rows}")
    if worst < 0:
        raise ValueError(f"worst must be 0 or more, got {worst}")
    scale = min(1.0, MAX_SIDE / max(ref.size))
    small = (max(1, round(ref.width * scale)), max(1, round(ref.height * scale)))
    if small[0] < cols or small[1] < rows:
        raise ValueError(f"image {ref.width}x{ref.height} is too small for a {cols}x{rows} grid")
    ga, gb = ref.convert("L"), impl.convert("L")
    if small != ref.size:
        ga, gb = ga.resize(small, Image.Resampling.BOX), gb.resize(small, Image.Resampling.BOX)

    np = None
    if use_numpy is not False:
        try:
            import numpy as np
        except ImportError:
            np = None
    method, scorer = ("ssim", _ssim_scorer(ga, gb, np)) if np is not None else ("luminance-mae", _mae_scorer(ga, gb))

    def clamp(x: float) -> float:
        return round(min(1.0, max(0.0, x)), 4)

    full = _tile_boxes(ref.width, ref.height, cols, rows)
    scaled = _tile_boxes(small[0], small[1], cols, rows)
    tiles = [{"col": c, "row": r, "box": box, "score": clamp(scorer(sbox))}
             for (c, r, box), (_, _, sbox) in zip(full, scaled)]
    ranked = sorted(tiles, key=lambda t: (t["score"], t["row"], t["col"]))
    return {
        "method": method,
        "overall": clamp(scorer([0, 0, small[0], small[1]])),
        "resized": resized,
        "aspect_mismatch": aspect_mismatch,
        "tiles": tiles,
        "worst": [{"col": t["col"], "row": t["row"], "score": t["score"]} for t in ranked[:worst]],
    }


def compare_images(reference, implementation, grid: tuple[int, int] = (4, 3),
                   worst: int = 3, use_numpy: bool | None = None) -> dict:
    """Score REFERENCE against IMPLEMENTATION per tile. See the module docstring for the report shape."""
    ref, impl, resized, aspect_mismatch = _load_pair(reference, implementation)
    return _score(ref, impl, resized, aspect_mismatch, grid, worst, use_numpy)


def _heat_map(ref: Image.Image, impl: Image.Image, report: dict) -> Image.Image:
    """Absolute difference, contrast-stretched and tinted, with the tile grid and the worst tiles outlined."""
    diff = ImageOps.autocontrast(ImageChops.difference(ref, impl).convert("L"))
    heat = ImageOps.colorize(diff, black=HEAT_LOW, white=HEAT_HIGH)
    draw = ImageDraw.Draw(heat)
    line = max(1, max(ref.size) // 400)
    worst = {(w["col"], w["row"]) for w in report["worst"]}
    for t in report["tiles"]:
        draw.rectangle(t["box"], outline=GRID_LINE, width=line)
    for t in report["tiles"]:
        if (t["col"], t["row"]) in worst:
            draw.rectangle(t["box"], outline=WORST_LINE, width=line * 3)
    return heat


def _board(images: list, labels: list[str], width: int) -> Image.Image:
    """`board.build_board` takes paths, so the in-memory images go through a temporary folder."""
    with tempfile.TemporaryDirectory() as tmp:
        paths = []
        for i, im in enumerate(images):
            paths.append(Path(tmp) / f"{i}.png")
            im.save(paths[-1])
        return build_board(paths, labels, len(paths), width)


def _parse_grid(text: str) -> tuple[int, int]:
    m = re.fullmatch(r"\s*(\d+)\s*[xX]\s*(\d+)\s*", text)
    if not m:
        raise ValueError(f"grid must look like 4x3 (columns x rows), got {text!r}")
    return int(m.group(1)), int(m.group(2))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("reference", help="approved mockup")
    ap.add_argument("implementation", help="screenshot of the implementation")
    ap.add_argument("--out", required=True, help="output sheet PNG")
    ap.add_argument("--grid", default="4x3", help="tile grid as COLUMNSxROWS (default 4x3)")
    ap.add_argument("--worst", type=int, default=3, help="how many of the lowest-scoring tiles to crop (default 3)")
    ap.add_argument("--report", help="also write the JSON report to this file")
    args = ap.parse_args(argv)

    out = Path(args.out)
    if not is_image_path(out):
        return fail(f"--out needs an image extension such as .png, got {out}", 2)
    missing = [p for p in (args.reference, args.implementation) if not Path(p).is_file()]
    if missing:
        return fail("image not found: " + ", ".join(missing), 2)
    try:
        grid = _parse_grid(args.grid)
        ref, impl, resized, aspect_mismatch = _load_pair(args.reference, args.implementation)
        report = _score(ref, impl, resized, aspect_mismatch, grid, args.worst, None)
    except (OSError, ValueError) as e:  # OSError covers unreadable and truncated images
        return fail(f"bad input: {e}", 2)

    if report["method"] == "luminance-mae":
        print("numpy is not installed: tiles are scored by luminance error, not SSIM (pip install numpy)",
              file=sys.stderr)
    if resized:
        print(f"implementation resized to the reference size {ref.width}x{ref.height}", file=sys.stderr)
    if aspect_mismatch:
        print("aspect ratios differ by more than 2 percent: capture the screenshot at the mockup's aspect",
              file=sys.stderr)

    text = json.dumps(report, indent=2)
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet = _board([ref, impl, _heat_map(ref, impl, report)],
                       ["reference", "implementation", "difference (contrast-stretched)"],
                       min(ref.width, SHEET_MAX_WIDTH))
        sheet.save(out)
        boxes = {(t["col"], t["row"]): t["box"] for t in report["tiles"]}
        for w in report["worst"]:
            box = boxes[(w["col"], w["row"])]
            crop = _board([ref.crop(box), impl.crop(box)],
                          [f"reference  col {w['col']} row {w['row']}", f"implementation  {w['score']:.3f}"],
                          max(box[2] - box[0], CROP_MIN_WIDTH))
            crop.save(out.with_name(f"{out.stem}-tile-{w['col']}-{w['row']}.png"))
        if args.report:
            report_path = Path(args.report)
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(text + "\n", encoding="utf-8")
    except (OSError, ValueError) as e:
        return fail(f"could not write {out}: {e}", 1)
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
