import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))

from PIL import Image, ImageChops  # noqa: E402

import board  # noqa: E402

PAD, LABEL_H = 24, 44


def run_cli(script: str, *args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                          capture_output=True, text=True, env=env)


class BoardTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.paths = []
        for i, (size, color) in enumerate([((1600, 1000), "#C04040"), ((1000, 1600), "#40C040"),
                                           ((800, 800), "#4040C0"), ((300, 50), "#C0C040")]):
            p = self.tmp / f"v{i + 1}.png"
            Image.new("RGB", size, color).save(p)
            self.paths.append(p)

    def tearDown(self):
        self._tmp.cleanup()

    def test_board_handles_mixed_aspect_ratios_and_default_labels(self):
        width = 200
        im = board.build_board(self.paths, None, None, width)
        tallest = round(1600 * width / 1000)
        cols, rows = 3, 2
        self.assertEqual(im.size, (cols * (width + PAD) + PAD, rows * (tallest + LABEL_H + PAD) + PAD))
        # every thumbnail is pasted at its own aspect ratio below its label strip
        self.assertEqual(im.getpixel((PAD + 5, PAD + LABEL_H + 5)), (0xC0, 0x40, 0x40))
        self.assertEqual(im.getpixel((PAD + (width + PAD) + 5, PAD + LABEL_H + tallest - 2)), (0x40, 0xC0, 0x40))
        row2 = PAD + (tallest + LABEL_H + PAD)
        self.assertEqual(im.getpixel((PAD + 5, row2 + LABEL_H + 5)), (0xC0, 0xC0, 0x40))
        # labels default to v1..vN
        explicit = board.build_board(self.paths, ["v1", "v2", "v3", "v4"], None, width)
        self.assertIsNone(ImageChops.difference(im, explicit).getbbox())
        other = board.build_board(self.paths, ["a", "b", "c", "d"], None, width)
        self.assertIsNotNone(ImageChops.difference(im, other).getbbox())

    def test_board_short_label_list_keeps_every_image(self):
        im = board.build_board(self.paths, ["first"], 4, 100)
        self.assertEqual(im.size[0], 4 * (100 + PAD) + PAD)
        # the fourth image is still drawn even though only one label was given
        self.assertEqual(im.getpixel((PAD + 3 * (100 + PAD) + 5, PAD + LABEL_H + 2)), (0xC0, 0xC0, 0x40))
        padded = board.build_board(self.paths, ["first", "v2", "v3", "v4"], 4, 100)
        self.assertIsNone(ImageChops.difference(im, padded).getbbox())

    def test_board_clamps_cols_and_rejects_bad_input(self):
        im = board.build_board(self.paths[:2], None, 10, 100)
        self.assertEqual(im.size[0], 2 * (100 + PAD) + PAD)
        with self.assertRaises(ValueError):
            board.build_board([], None, None, 100)
        with self.assertRaises(ValueError):
            board.build_board(self.paths, None, None, 0)
        with self.assertRaises(ValueError):
            board.build_board(self.paths, None, 0, 100)

    def test_cli_writes_board_and_prints_path(self):
        out = self.tmp / "board.png"
        res = run_cli("board.py", *map(str, self.paths[:2]), "--out", str(out), "--labels", "a, b", "--width", "120")
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(res.stdout.strip(), str(out))
        with Image.open(out) as im:
            self.assertEqual(im.size[0], 2 * (120 + PAD) + PAD)

    def test_cli_missing_input_exits_2_with_message_on_stderr(self):
        res = run_cli("board.py", str(self.paths[0]), str(self.tmp / "nope.png"), "--out", str(self.tmp / "b.png"))
        self.assertEqual(res.returncode, 2)
        self.assertIn("nope.png", res.stderr)
        self.assertEqual(res.stdout, "")
        self.assertNotIn("Traceback", res.stderr)
        self.assertFalse((self.tmp / "b.png").exists())

    def test_cli_out_without_image_extension_exits_2_and_writes_nothing(self):
        for name in ("sheets/board", "sheets/board.txt"):
            res = run_cli("board.py", str(self.paths[0]), "--out", str(self.tmp / name))
            self.assertEqual(res.returncode, 2, name)
            self.assertIn("--out", res.stderr)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)
            self.assertFalse((self.tmp / "sheets").exists())

    def test_cli_truncated_image_exits_2_without_traceback(self):
        whole = self.tmp / "noise.png"
        Image.effect_noise((400, 300), 64).convert("RGB").save(whole)
        data = whole.read_bytes()
        truncated = self.tmp / "half.png"
        truncated.write_bytes(data[:len(data) // 2])
        out = self.tmp / "b.png"
        res = run_cli("board.py", str(self.paths[0]), str(truncated), "--out", str(out))
        self.assertEqual(res.returncode, 2, res.stderr)
        self.assertIn("truncated", res.stderr)
        self.assertEqual(res.stdout, "")
        self.assertNotIn("Traceback", res.stderr)
        self.assertFalse(out.exists())

    def test_cli_help(self):
        res = run_cli("board.py", "--help")
        self.assertEqual(res.returncode, 0)
        self.assertIn("--labels", res.stdout)


if __name__ == "__main__":
    unittest.main()
