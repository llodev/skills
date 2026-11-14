import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))

from PIL import Image, ImageDraw  # noqa: E402

import compare  # noqa: E402

REPORT_KEYS = {"method", "overall", "resized", "aspect_mismatch", "tiles", "worst"}

try:  # numpy is optional: SSIM with it, luminance error without it
    import numpy  # noqa: F401
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
DEFAULT_METHOD = "ssim" if HAS_NUMPY else "luminance-mae"


def run_cli(script: str, *args: str, env_extra=None) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", **(env_extra or {}))
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                          capture_output=True, text=True, env=env)


def child_has_numpy(env_extra=None) -> bool:
    """Whether a child interpreter (the CLI tests run one) can import numpy; it may differ from this process."""
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", **(env_extra or {}))
    return subprocess.run([sys.executable, "-c", "import numpy"], capture_output=True, env=env).returncode == 0


def mockup(size=(800, 600)) -> Image.Image:
    """A textured synthetic screen: a gradient, stripes and a few cards, so every tile has structure."""
    w, h = size
    gray = Image.linear_gradient("L").resize(size)
    im = Image.merge("RGB", (gray, gray.transpose(Image.Transpose.FLIP_LEFT_RIGHT), gray.rotate(90).resize(size)))
    d = ImageDraw.Draw(im)
    for x in range(0, w, 23):
        d.line([(x, 0), (x, h)], fill="#202830", width=2)
    for y in range(0, h, 31):
        d.line([(0, y), (w, y)], fill="#E0E4EA", width=1)
    for i in range(6):
        x0, y0 = 30 + i * w // 7, 40 + (i % 3) * h // 4
        d.rectangle([x0, y0, x0 + w // 10, y0 + h // 8], fill=("#3355AA" if i % 2 else "#F0C040"))
    return im


class CompareTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.ref = self.tmp / "ref.png"
        mockup().save(self.ref)

    def tearDown(self):
        self._tmp.cleanup()

    def save(self, im: Image.Image, name: str) -> Path:
        p = self.tmp / name
        im.save(p)
        return p

    def altered(self) -> Path:
        im = mockup()
        # tile (col 2, row 1) of a 4x3 grid on 800x600 spans x 400-600, y 200-400
        ImageDraw.Draw(im).rectangle([430, 230, 570, 370], fill="#FF00FF")
        return self.save(im, "impl.png")

    def test_identical_images_score_one(self):
        for use_numpy in (None, False):
            r = compare.compare_images(self.ref, self.ref, use_numpy=use_numpy)
            self.assertEqual(set(r), REPORT_KEYS)
            self.assertGreaterEqual(r["overall"], 0.999, r["method"])
            self.assertEqual(len(r["tiles"]), 12)
            for t in r["tiles"]:
                self.assertGreaterEqual(t["score"], 0.999, (r["method"], t))
            self.assertFalse(r["resized"])
            self.assertFalse(r["aspect_mismatch"])

    def test_altered_tile_is_the_worst(self):
        impl = self.altered()
        for use_numpy in (None, False):
            r = compare.compare_images(self.ref, impl, grid=(4, 3), worst=3, use_numpy=use_numpy)
            self.assertEqual((r["worst"][0]["col"], r["worst"][0]["row"]), (2, 1), r["method"])
            self.assertEqual(len(r["worst"]), 3)
            scores = [w["score"] for w in r["worst"]]
            self.assertEqual(scores, sorted(scores))
            self.assertLess(r["overall"], 1.0)
            for t in r["tiles"] + r["worst"]:
                self.assertTrue(0.0 <= t["score"] <= 1.0, t)
            tile = next(t for t in r["tiles"] if (t["col"], t["row"]) == (2, 1))
            self.assertEqual(tile["box"], [400, 200, 600, 400])

    def test_method_is_ssim_with_numpy_and_mae_without(self):
        self.assertEqual(compare.compare_images(self.ref, self.ref)["method"], DEFAULT_METHOD)
        self.assertEqual(compare.compare_images(self.ref, self.ref, use_numpy=True)["method"], DEFAULT_METHOD)
        self.assertEqual(compare.compare_images(self.ref, self.ref, use_numpy=False)["method"], "luminance-mae")
        with mock.patch.dict(sys.modules, {"numpy": None}):  # numpy not installed
            self.assertEqual(compare.compare_images(self.ref, self.ref)["method"], "luminance-mae")

    def test_size_mismatch_is_resized_and_reported(self):
        half = self.save(mockup().resize((400, 300)), "half.png")
        r = compare.compare_images(self.ref, half)
        self.assertTrue(r["resized"])
        self.assertFalse(r["aspect_mismatch"])
        self.assertEqual(len(r["tiles"]), 12)
        # boxes are in reference pixels: the last tile ends at the reference size
        self.assertEqual(r["tiles"][-1]["box"][2:], [800, 600])
        self.assertGreater(r["overall"], 0.5)

    def test_aspect_mismatch_is_flagged(self):
        squat = self.save(mockup((800, 500)), "squat.png")
        r = compare.compare_images(self.ref, squat)
        self.assertTrue(r["resized"])
        self.assertTrue(r["aspect_mismatch"])
        # within 2 percent is not a mismatch
        close = self.save(mockup((800, 592)), "close.png")
        r = compare.compare_images(self.ref, close)
        self.assertTrue(r["resized"])
        self.assertFalse(r["aspect_mismatch"])

    def test_bad_grid_and_worst_are_rejected(self):
        with self.assertRaises(ValueError):
            compare.compare_images(self.ref, self.ref, grid=(0, 3))
        with self.assertRaises(ValueError):
            compare.compare_images(self.ref, self.ref, worst=-1)
        r = compare.compare_images(self.ref, self.ref, grid=(2, 2), worst=10)
        self.assertEqual(len(r["worst"]), 4)

    def test_cli_writes_sheet_and_worst_tile_crops_and_prints_json(self):
        impl = self.altered()
        out = self.tmp / "qa" / "compare-01.png"
        report = self.tmp / "qa" / "report.json"
        res = run_cli("compare.py", str(self.ref), str(impl), "--out", str(out),
                      "--grid", "4x3", "--worst", "2", "--report", str(report))
        self.assertEqual(res.returncode, 0, res.stderr)
        data = json.loads(res.stdout)
        self.assertEqual(set(data), REPORT_KEYS)
        self.assertEqual(data["method"], "ssim" if child_has_numpy() else "luminance-mae")
        self.assertEqual(len(data["worst"]), 2)
        self.assertEqual(json.loads(report.read_text(encoding="utf-8")), data)
        with Image.open(out) as sheet:
            # reference, implementation and heat map side by side
            self.assertGreater(sheet.width, 3 * sheet.height // 2)
        crops = sorted(p.name for p in out.parent.glob("compare-01-tile-*.png"))
        expected = sorted(f"compare-01-tile-{w['col']}-{w['row']}.png" for w in data["worst"])
        self.assertEqual(crops, expected)
        self.assertIn("compare-01-tile-2-1.png", crops)
        with Image.open(out.parent / "compare-01-tile-2-1.png") as crop:
            # reference crop beside implementation crop: two tiles wide, one tall
            self.assertGreater(crop.width, crop.height)

    def test_cli_without_numpy_falls_back_to_luminance_and_says_so(self):
        # A package named numpy that fails to import hides a real install from the child interpreter.
        blocker = self.tmp / "blocker" / "numpy"
        blocker.mkdir(parents=True)
        (blocker / "__init__.py").write_text('raise ImportError("numpy hidden by the test")\n')
        env_extra = {"PYTHONPATH": str(blocker.parent)}
        self.assertFalse(child_has_numpy(env_extra))
        res = run_cli("compare.py", str(self.ref), str(self.altered()), "--out", str(self.tmp / "qa" / "c.png"),
                      env_extra=env_extra)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(json.loads(res.stdout)["method"], "luminance-mae")
        self.assertIn("numpy is not installed", res.stderr)

    def test_sheet_labels_the_heat_map_as_contrast_stretched(self):
        out = self.tmp / "qa" / "compare-01.png"
        with mock.patch.object(compare, "_board", wraps=compare._board) as board, \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            code = compare.main([str(self.ref), str(self.altered()), "--out", str(out), "--worst", "0"])
        self.assertEqual(code, 0)
        labels = board.call_args_list[0].args[1]
        self.assertEqual(labels[:2], ["reference", "implementation"])
        self.assertIn("contrast-stretched", labels[2])
        self.assertIn("contrast-stretched", compare.__doc__)

    def test_cli_out_without_image_extension_exits_2_and_writes_nothing(self):
        for name in ("qa/compare-01", "qa/compare-01.json"):
            res = run_cli("compare.py", str(self.ref), str(self.ref), "--out", str(self.tmp / name))
            self.assertEqual(res.returncode, 2, name)
            self.assertIn("--out", res.stderr)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)
            self.assertFalse((self.tmp / "qa").exists())

    def test_cli_truncated_image_exits_2_without_traceback(self):
        whole = self.save(Image.effect_noise((400, 300), 64).convert("RGB"), "noise.png")
        data = whole.read_bytes()
        half = self.tmp / "half.png"
        half.write_bytes(data[:len(data) // 2])
        out = self.tmp / "c.png"
        for args in ([str(self.ref), str(half)], [str(half), str(self.ref)]):
            res = run_cli("compare.py", *args, "--out", str(out))
            self.assertEqual(res.returncode, 2, res.stderr)
            self.assertIn("truncated", res.stderr)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)
            self.assertFalse(out.exists())

    def test_cli_bad_input_exits_2_with_message_on_stderr(self):
        out = self.tmp / "c.png"
        for args in ([str(self.ref), str(self.tmp / "nope.png"), "--out", str(out)],
                     [str(self.ref), str(self.ref), "--out", str(out), "--grid", "4by3"],
                     [str(self.ref), str(self.ref), "--out", str(out), "--worst", "-1"]):
            res = run_cli("compare.py", *args)
            self.assertEqual(res.returncode, 2, args)
            self.assertEqual(res.stdout, "")
            self.assertTrue(res.stderr.strip())
            self.assertNotIn("Traceback", res.stderr)
            self.assertFalse(out.exists())

    def test_cli_help(self):
        res = run_cli("compare.py", "--help")
        self.assertEqual(res.returncode, 0)
        self.assertIn("--grid", res.stdout)
        self.assertIn("--report", res.stdout)


if __name__ == "__main__":
    unittest.main()
