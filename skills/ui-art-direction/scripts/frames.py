#!/usr/bin/env python3
"""Extract evenly spaced keyframes from a video clip and a contact sheet of them, for reading motion.

Frame i of N is taken at (i + 0.5) / N of the duration reported by ffprobe, so the first and last frames sit
inside the clip rather than on its edges. Frames are saved as DIR/frame-01.png ..., the sheet as DIR/sheet.png.
Prints each frame path, then the sheet path. Needs ffmpeg and ffprobe on the PATH.

Frames from an earlier run with the same --out-dir are not deleted: a rerun with a smaller --count leaves
the extra old frame files beside the new ones. Use a fresh --out-dir per clip and count.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import fail  # noqa: E402
from board import build_board  # noqa: E402

from PIL import UnidentifiedImageError  # noqa: E402

SHEET_COLS, SHEET_WIDTH = 4, 480
FFMPEG_HINT = "ffmpeg and ffprobe must be on the PATH to read video: install ffmpeg (https://ffmpeg.org/download.html)"


class MissingTool(RuntimeError):
    """ffmpeg or ffprobe is not installed."""


def _duration(ffprobe: str, video: Path) -> float:
    res = subprocess.run([ffprobe, "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=noprint_wrappers=1:nokey=1", str(video)],
                         capture_output=True, text=True)
    try:
        duration = float(res.stdout.strip()) if res.returncode == 0 else 0.0
    except ValueError:
        duration = 0.0
    if not duration > 0:  # also rejects nan
        detail = res.stderr.strip() or res.stdout.strip() or "no duration reported"
        raise ValueError(f"could not read the duration of {video}: {detail}")
    return duration


def extract_frames(video, out_dir, count: int = 8) -> list:
    """Save `count` frames of `video` into `out_dir` and return their paths in time order."""
    video, out_dir = Path(video), Path(out_dir)
    if count < 1:
        raise ValueError(f"count must be at least 1, got {count}")
    if not video.is_file():
        raise ValueError(f"video not found: {video}")
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise MissingTool(FFMPEG_HINT)
    duration = _duration(ffprobe, video)
    out_dir.mkdir(parents=True, exist_ok=True)
    digits = max(2, len(str(count)))
    paths = []
    for i in range(count):
        target = out_dir / f"frame-{i + 1:0{digits}d}.png"
        seek = (i + 0.5) / count * duration
        res = subprocess.run([ffmpeg, "-v", "error", "-y", "-ss", f"{seek:.3f}", "-i", str(video),
                              "-frames:v", "1", str(target)], capture_output=True, text=True)
        if res.returncode != 0 or not target.is_file():
            raise RuntimeError(f"ffmpeg could not extract a frame at {seek:.3f}s: {res.stderr.strip()}")
        paths.append(target)
    return paths


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", help="video clip")
    ap.add_argument("--out-dir", required=True,
                    help="folder for the frames and sheet.png; frames from an earlier run are not deleted")
    ap.add_argument("--count", type=int, default=8, help="number of frames (default 8)")
    args = ap.parse_args(argv)

    out_dir = Path(args.out_dir)
    try:
        paths = extract_frames(args.video, out_dir, args.count)
    except MissingTool as e:
        return fail(str(e), 2)
    except ValueError as e:
        return fail(f"bad input: {e}", 2)
    except (RuntimeError, OSError) as e:
        return fail(str(e), 1)
    sheet_path = out_dir / "sheet.png"
    labels = [f"{i + 1}/{len(paths)}" for i in range(len(paths))]
    try:
        build_board(paths, labels, min(len(paths), SHEET_COLS), SHEET_WIDTH).save(sheet_path)
    except (OSError, UnidentifiedImageError, ValueError) as e:
        return fail(f"could not write {sheet_path}: {e}", 1)
    for p in paths:
        print(p)
    print(sheet_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
