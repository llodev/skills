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

import _common  # noqa: E402
import wireframe  # noqa: E402

PAGE = (0xF2, 0xF2, 0xF0)


def run_cli(script: str, *args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                          capture_output=True, text=True, env=env)


class WireframeTests(unittest.TestCase):
    def test_wireframe_renders_every_box_at_spec_size(self):
        spec = {"size": [800, 500], "boxes": [
            {"x": 0, "y": 0, "w": 18, "h": 100, "label": "sidebar: navigation and history"},
            {"x": 18, "y": 0, "w": 82, "h": 10, "label": "top bar: conversation title"},
            {"x": 18, "y": 10, "w": 82, "h": 72, "label": "main area: messages"},
            {"x": 18, "y": 82, "w": 82, "h": 18},
        ]}
        im = wireframe.render_wireframe(spec)
        self.assertEqual(im.size, (800, 500))
        W, H = im.size
        for b in spec["boxes"]:
            cx = int((b["x"] + b["w"] / 2) * W / 100)
            cy = int((b["y"] + b["h"] / 2) * H / 100)
            self.assertNotEqual(im.convert("RGB").getpixel((cx, cy)), PAGE, b)

    def test_wrap_label_never_exceeds_max_width_except_single_long_word(self):
        im = Image.new("RGB", (400, 200))
        draw = ImageDraw.Draw(im)
        fnt = _common.font(18)
        label = "a fairly long label that has to wrap across several lines Supercalifragilisticexpialidocious end"
        max_width = 120.0
        lines = wireframe.wrap_label(draw, label, fnt, max_width)
        self.assertGreater(len(lines), 1)
        self.assertEqual(" ".join(lines).split(), label.split())
        for line in lines:
            if draw.textlength(line, font=fnt) > max_width:
                self.assertNotIn(" ", line, f"multi-word line overflows: {line!r}")
        self.assertIn("Supercalifragilisticexpialidocious", lines)
        self.assertEqual(wireframe.wrap_label(draw, "word", fnt, 1.0), ["word"])
        self.assertEqual(wireframe.wrap_label(draw, "", fnt, 100.0), [])

    def test_wireframe_survives_unlabeled_box_box_past_100_percent_and_empty_boxes(self):
        spec = {"size": [400, 300], "boxes": [
            {"x": 0, "y": 0, "w": 50, "h": 50},
            {"x": 80, "y": 80, "w": 60, "h": 60, "label": "box that runs past the frame"},
            {"x": -10, "y": 10, "w": 5, "h": 5, "label": "fully outside"},
            {"x": 50, "y": 0, "w": 0.5, "h": 0.5, "label": "tiny"},
        ]}
        im = wireframe.render_wireframe(spec)
        self.assertEqual(im.size, (400, 300))
        # the overflowing box is clamped to the frame, so its fill reaches the bottom-right corner
        self.assertNotEqual(im.convert("RGB").getpixel((390, 290)), PAGE)
        for empty in ({"size": [320, 200], "boxes": []}, {"size": [320, 200]}):
            im = wireframe.render_wireframe(empty)
            self.assertEqual(im.size, (320, 200))
            self.assertEqual(im.convert("RGB").getcolors(), [(320 * 200, PAGE)])

    def test_default_size_is_16_9_full_hd_and_docstring_lists_it_first(self):
        # The layout lock must share the aspect of the generation (--aspect 16:9 by default).
        self.assertEqual(wireframe.DEFAULT_SIZE, (1920, 1080))
        self.assertEqual(wireframe.render_wireframe({"boxes": []}).size, (1920, 1080))
        self.assertIn('"size": [1920, 1080]', wireframe.__doc__)
        self.assertNotIn("1600", wireframe.__doc__)

    def test_wireframe_rejects_malformed_spec(self):
        for bad in ({"size": [0, 100], "boxes": []}, {"size": "big"},
                    {"boxes": [{"x": "a", "y": 0, "w": 10, "h": 10}]}, {"boxes": [{"x": 0}]}, []):
            with self.assertRaises(ValueError, msg=bad):
                wireframe.render_wireframe(bad)

    def test_cli_writes_png_and_prints_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = Path(tmp) / "wire.json"
            spec.write_text(json.dumps({"size": [300, 200], "boxes": [{"x": 0, "y": 0, "w": 50, "h": 100}]}))
            out = Path(tmp) / "layout" / "wire.png"
            res = run_cli("wireframe.py", str(spec), "--out", str(out))
            self.assertEqual(res.returncode, 0, res.stderr)
            self.assertEqual(res.stdout.strip(), str(out))
            with Image.open(out) as im:
                self.assertEqual(im.size, (300, 200))

    def test_cli_missing_input_exits_2_with_message_on_stderr(self):
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "nope.json"
            res = run_cli("wireframe.py", str(missing), "--out", str(Path(tmp) / "w.png"))
            self.assertEqual(res.returncode, 2)
            self.assertIn("nope.json", res.stderr)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)

    def test_cli_out_without_image_extension_exits_2_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = Path(tmp) / "wire.json"
            spec.write_text(json.dumps({"size": [300, 200], "boxes": []}))
            for name in ("layout/wire", "layout/wire.txt"):
                out = Path(tmp) / name
                res = run_cli("wireframe.py", str(spec), "--out", str(out))
                self.assertEqual(res.returncode, 2, name)
                self.assertIn("--out", res.stderr)
                self.assertEqual(res.stdout, "")
                self.assertNotIn("Traceback", res.stderr)
                self.assertFalse((Path(tmp) / "layout").exists())

    def test_cli_help(self):
        res = run_cli("wireframe.py", "--help")
        self.assertEqual(res.returncode, 0)
        self.assertIn("--out", res.stdout)


ENTRY_SCRIPTS = ("board.py", "compare.py", "frames.py", "generate.py", "palette.py", "wireframe.py")


class BytecodeTests(unittest.TestCase):
    def test_entry_scripts_never_write_pycache_beside_themselves(self):
        """Running a script imports _common (and board); that must not leave __pycache__ in the package,
        even when PYTHONDONTWRITEBYTECODE is not set."""
        env = {k: v for k, v in os.environ.items() if k != "PYTHONDONTWRITEBYTECODE"}
        for script in ENTRY_SCRIPTS:
            with self.subTest(script), tempfile.TemporaryDirectory() as tmp:
                # A fresh copy per script: the package folder stays clean and each script is judged alone.
                copy = Path(tmp) / "scripts"
                copy.mkdir()
                for src in SCRIPTS.glob("*.py"):
                    (copy / src.name).write_bytes(src.read_bytes())
                res = subprocess.run([sys.executable, str(copy / script), "--help"],
                                     capture_output=True, text=True, env=env)
                self.assertEqual(res.returncode, 0, res.stderr)
                self.assertFalse((copy / "__pycache__").exists(), f"{script} wrote __pycache__")


class CommonTests(unittest.TestCase):
    def test_contrast_and_hex(self):
        self.assertAlmostEqual(_common.contrast((0, 0, 0), (255, 255, 255)), 21.0, places=2)
        self.assertAlmostEqual(_common.contrast((255, 255, 255), (0, 0, 0)), 21.0, places=2)
        self.assertEqual(_common.contrast((10, 20, 30), (10, 20, 30)), 1.0)
        self.assertAlmostEqual(_common.relative_luminance((255, 255, 255)), 1.0)
        self.assertEqual(_common.hex_of((10, 171, 255)), "#0AABFF")

    def test_write_sidecar(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = _common.write_sidecar(Path(tmp) / "mock-1.png", {"prompt": "café"})
            self.assertEqual(path, Path(tmp) / "mock-1.json")
            text = path.read_text(encoding="utf-8")
            self.assertIn("café", text)
            self.assertIn('\n  "prompt"', text)
            self.assertEqual(json.loads(text), {"prompt": "café"})


if __name__ == "__main__":
    unittest.main()
