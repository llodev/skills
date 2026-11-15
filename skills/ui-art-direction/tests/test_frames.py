import io
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))

from PIL import Image  # noqa: E402

import frames  # noqa: E402

HAS_FFMPEG = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def run_cli(script: str, *args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    return subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                          capture_output=True, text=True, env=env)


class FramesTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.video = self.tmp / "clip.mp4"
        self.video.write_bytes(b"not really a video")

    def tearDown(self):
        self._tmp.cleanup()

    def test_frames_without_ffmpeg_exits_2(self):
        out_dir = self.tmp / "frames"
        err, out = io.StringIO(), io.StringIO()
        with mock.patch("shutil.which", return_value=None), redirect_stderr(err), redirect_stdout(out):
            code = frames.main([str(self.video), "--out-dir", str(out_dir)])
        self.assertEqual(code, 2)
        self.assertIn("ffmpeg", err.getvalue())
        self.assertEqual(out.getvalue(), "")
        self.assertFalse(out_dir.exists())

    def test_frames_are_taken_at_centered_times_with_a_contact_sheet(self):
        """Runs everywhere: ffprobe and ffmpeg are faked, so the timing and outputs are checked without them."""
        calls = []

        def fake_run(cmd, **kwargs):
            calls.append(cmd)
            if Path(cmd[0]).name == "ffprobe":
                return subprocess.CompletedProcess(cmd, 0, stdout="10.0\n", stderr="")
            Image.new("RGB", (64, 36), "#335577").save(cmd[-1])
            return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

        out_dir = self.tmp / "frames"
        with mock.patch("shutil.which", side_effect=lambda name: f"/usr/bin/{name}"), \
                mock.patch("subprocess.run", side_effect=fake_run):
            paths = frames.extract_frames(self.video, out_dir, count=4)
        self.assertEqual(len(paths), 4)
        for p in paths:
            self.assertTrue(Path(p).is_file())
        seeks = [float(c[c.index("-ss") + 1]) for c in calls if Path(c[0]).name == "ffmpeg"]
        self.assertEqual(seeks, [1.25, 3.75, 6.25, 8.75])

        out = io.StringIO()
        with mock.patch("shutil.which", side_effect=lambda name: f"/usr/bin/{name}"), \
                mock.patch("subprocess.run", side_effect=fake_run), redirect_stdout(out):
            code = frames.main([str(self.video), "--out-dir", str(out_dir), "--count", "3"])
        self.assertEqual(code, 0)
        lines = out.getvalue().splitlines()
        self.assertEqual(len(lines), 4)
        self.assertEqual(lines[-1], str(out_dir / "sheet.png"))
        self.assertTrue((out_dir / "sheet.png").is_file())

    def test_frames_bad_count_or_missing_video_exits_2(self):
        for args in ([str(self.video), "--out-dir", str(self.tmp / "f"), "--count", "0"],
                     [str(self.tmp / "nope.mp4"), "--out-dir", str(self.tmp / "f")]):
            res = run_cli("frames.py", *args)
            self.assertEqual(res.returncode, 2, args)
            self.assertEqual(res.stdout, "")
            self.assertNotIn("Traceback", res.stderr)

    def test_cli_help(self):
        res = run_cli("frames.py", "--help")
        self.assertEqual(res.returncode, 0)
        self.assertIn("--count", res.stdout)
        # a rerun with a smaller --count leaves the earlier frames in place; the help says so
        self.assertIn("not deleted", " ".join(res.stdout.split()))

    @unittest.skipUnless(HAS_FFMPEG, "ffmpeg and ffprobe are not on the path")
    def test_frames_extracts_count_frames(self):
        video = self.tmp / "testsrc.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=duration=2:size=320x180:rate=10",
                        "-pix_fmt", "yuv420p", str(video)], check=True)
        out_dir = self.tmp / "frames"
        res = run_cli("frames.py", str(video), "--out-dir", str(out_dir), "--count", "5")
        self.assertEqual(res.returncode, 0, res.stderr)
        lines = res.stdout.splitlines()
        self.assertEqual(len(lines), 6)
        for line in lines[:-1]:
            self.assertTrue(Path(line).is_file(), line)
        self.assertEqual(lines[-1], str(out_dir / "sheet.png"))
        self.assertTrue((out_dir / "sheet.png").is_file())


if __name__ == "__main__":
    unittest.main()
