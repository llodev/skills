import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))

from PIL import Image, ImageDraw  # noqa: E402

import palette  # noqa: E402
from _common import contrast  # noqa: E402

ROLE_OF_CHECK = {"foreground/background": ("foreground", "background"),
                 "muted/background": ("muted-foreground", "background"),
                 "accent/background": ("accent", "background")}


def rgb_of(hex_str: str) -> tuple[int, int, int]:
    return tuple(int(hex_str[i:i + 2], 16) for i in (1, 3, 5))


def run_cli(script: str, *args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                          capture_output=True, text=True, env=env)


class PaletteTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def dark_gold(self) -> Path:
        im = Image.new("RGB", (400, 300), (14, 14, 18))
        d = ImageDraw.Draw(im)
        d.rectangle([20, 20, 380, 80], fill=(236, 236, 232))     # light text block
        d.rectangle([20, 100, 180, 160], fill=(30, 30, 38))       # surface card
        d.rectangle([200, 200, 320, 260], fill=(212, 175, 55))    # gold accent
        d.rectangle([20, 200, 180, 230], fill=(140, 140, 146))    # muted text
        p = self.tmp / "dark-gold.png"
        im.save(p)
        return p

    def test_palette_picks_visible_accent(self):
        result = palette.analyze(self.dark_gold())
        roles = result["roles"]
        self.assertEqual(set(result), {"source", "swatches", "roles", "contrast", "notes"})
        self.assertGreaterEqual(contrast(rgb_of(roles["accent"]), rgb_of(roles["background"])), 3.0)
        self.assertNotEqual(roles["accent"], roles["foreground"])
        r, g, b = rgb_of(roles["accent"])
        self.assertGreater(r - b, 80, roles["accent"])  # the gold, not a gray
        self.assertEqual(result["notes"], [])

    def test_palette_flags_monochrome_image(self):
        im = Image.linear_gradient("L").resize((300, 200)).convert("RGB")
        p = self.tmp / "gray.png"
        im.save(p)
        result = palette.analyze(p)
        self.assertTrue(result["notes"])
        self.assertEqual(result["roles"]["accent"], result["roles"]["foreground"])

    def test_palette_single_flat_color_does_not_crash(self):
        p = self.tmp / "flat.png"
        Image.new("RGB", (64, 64), (40, 90, 160)).save(p)
        result = palette.analyze(p)
        self.assertEqual(len(result["swatches"]), 1)
        self.assertTrue(result["notes"])
        for role in result["roles"].values():
            self.assertRegex(role, r"^#[0-9A-F]{6}$")

    def test_palette_reported_contrast_matches_recomputed(self):
        gray = self.tmp / "gray.png"
        Image.linear_gradient("L").resize((200, 200)).convert("RGB").save(gray)
        flat = self.tmp / "flat.png"
        Image.new("RGB", (32, 32), (250, 250, 250)).save(flat)
        for src in (self.dark_gold(), gray, flat):
            result = palette.analyze(src)
            self.assertEqual(set(result["contrast"]), set(ROLE_OF_CHECK))
            for key, (fg, bg) in ROLE_OF_CHECK.items():
                recomputed = contrast(rgb_of(result["roles"][fg]), rgb_of(result["roles"][bg]))
                self.assertAlmostEqual(result["contrast"][key], recomputed, delta=0.01, msg=(src.name, key))

    def test_palette_rejects_bad_color_count(self):
        with self.assertRaises(ValueError):
            palette.analyze(self.dark_gold(), colors=0)
        with self.assertRaises(ValueError):
            palette.analyze(self.dark_gold(), colors=300)

    def test_cli_writes_tokens_css_and_swatch(self):
        src = self.dark_gold()
        out = self.tmp / "spec" / "tokens.json"
        swatch = self.tmp / "spec" / "palette.png"
        res = run_cli("palette.py", str(src), "--out", str(out), "--swatch", str(swatch))
        self.assertEqual(res.returncode, 0, res.stderr)
        printed = json.loads(res.stdout)
        self.assertEqual(set(printed), {"roles", "contrast", "notes"})
        full = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(full["roles"], printed["roles"])
        css = out.with_suffix(".css").read_text(encoding="utf-8")
        self.assertIn(f"--accent: {printed['roles']['accent']};", css)
        self.assertTrue(css.startswith(":root {"))
        with Image.open(swatch) as im:
            self.assertEqual(im.height, 120)

    def test_cli_missing_input_exits_2_with_message_on_stderr(self):
        res = run_cli("palette.py", str(self.tmp / "nope.png"))
        self.assertEqual(res.returncode, 2)
        self.assertIn("nope.png", res.stderr)
        self.assertEqual(res.stdout, "")
        self.assertNotIn("Traceback", res.stderr)

    def test_cli_out_ending_in_css_exits_2_and_writes_nothing(self):
        out = self.tmp / "spec" / "tokens.css"
        res = run_cli("palette.py", str(self.dark_gold()), "--out", str(out))
        self.assertEqual(res.returncode, 2, res.stderr)
        self.assertIn("--out is the JSON path; the CSS file is written beside it", res.stderr)
        self.assertEqual(res.stdout, "")
        self.assertNotIn("Traceback", res.stderr)
        self.assertFalse((self.tmp / "spec").exists())

    def test_cli_swatch_without_image_extension_exits_2_and_writes_nothing(self):
        out = self.tmp / "spec" / "tokens.json"
        for name in ("spec/palette", "spec/palette.txt"):
            res = run_cli("palette.py", str(self.dark_gold()), "--out", str(out), "--swatch", str(self.tmp / name))
            self.assertEqual(res.returncode, 2, name)
            self.assertIn("--swatch", res.stderr)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)
            self.assertFalse((self.tmp / "spec").exists())

    def test_cli_truncated_image_exits_2_without_traceback(self):
        whole = self.tmp / "noise.png"
        Image.effect_noise((400, 300), 64).convert("RGB").save(whole)
        data = whole.read_bytes()
        half = self.tmp / "half.png"
        half.write_bytes(data[:len(data) // 2])
        res = run_cli("palette.py", str(half))
        self.assertEqual(res.returncode, 2, res.stderr)
        self.assertIn("truncated", res.stderr)
        self.assertEqual(res.stdout, "")
        self.assertNotIn("Traceback", res.stderr)

    def test_cli_help(self):
        res = run_cli("palette.py", "--help")
        self.assertEqual(res.returncode, 0)
        self.assertIn("--swatch", res.stdout)


if __name__ == "__main__":
    unittest.main()
