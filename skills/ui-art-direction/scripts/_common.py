"""Shared helpers for the ui-art-direction scripts: fonts, WCAG contrast, hex colors, JSON sidecars."""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFont
except ImportError:  # Pillow is required by every script that touches images
    print("Pillow is required: pip install pillow", file=sys.stderr)
    raise SystemExit(2)

FONT_CANDIDATES = ("Inter-SemiBold.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf", "Helvetica.ttc")


def font(size: int):
    """A TrueType font at `size` if one of the usual faces is installed, else Pillow's default font."""
    for name in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow older than 10.1 has no sized default font
        return ImageFont.load_default()


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    """WCAG 2 relative luminance of an sRGB color given as 0-255 channels."""
    def channel(c: float) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(c) for c in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    """WCAG 2 contrast ratio between two colors, from 1.0 to 21.0, order-independent."""
    la, lb = sorted((relative_luminance(a), relative_luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hex_of(rgb: tuple[int, int, int]) -> str:
    """`#RRGGBB`, uppercase."""
    return "#{:02X}{:02X}{:02X}".format(*rgb[:3])


def write_sidecar(image_path, data: dict) -> Path:
    """Write `data` as `<stem>.json` beside `image_path` and return that path."""
    image_path = Path(image_path)
    target = image_path.with_name(f"{image_path.stem}.json")
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def is_image_path(path) -> bool:
    """True when Pillow can save an image under this file extension (.png, .jpg, .webp, ...)."""
    fmt = Image.registered_extensions().get(Path(path).suffix.lower())
    return fmt is not None and fmt in Image.SAVE


def fail(message: str, code: int) -> int:
    """Print a human message to stderr and return the exit code, for `return fail(...)` in `main`."""
    print(message, file=sys.stderr)
    return code
