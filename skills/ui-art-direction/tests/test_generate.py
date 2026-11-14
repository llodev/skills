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

from PIL import Image  # noqa: E402

import generate as gen  # noqa: E402

SIDECAR_KEYS = {"model", "provider", "aspect", "refs", "prompt", "outputs", "created_at"}


def png_bytes(color: str, size=(64, 40)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


class FakeAdapter:
    """Stands in for a provider: records each call and returns canned images (or raises)."""

    def __init__(self, images=None, error=None):
        self.images, self.error, self.calls = images or [], error, []

    def __call__(self, model, prompt, refs, aspect, n):
        self.calls.append({"model": model, "prompt": prompt, "refs": list(refs), "aspect": aspect, "n": n})
        if self.error:
            raise self.error
        return list(self.images)


def run_main(argv, env=None):
    """Run gen.main in-process with a controlled environment; return (code, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    with mock.patch.dict(os.environ, env or {}, clear=True), \
            contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = gen.main(argv)
    return code, out.getvalue(), err.getvalue()


class GenerateTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def files_under(self, root: Path) -> list[Path]:
        return sorted(p for p in root.rglob("*") if p.is_file())

    def test_resolve_model_prefers_flag_then_env_and_exits_2_with_docs_hint_when_missing(self):
        self.assertEqual(gen.resolve_model("flag-model", {"IMAGE_MODEL": "env-model"}), "flag-model")
        self.assertEqual(gen.resolve_model(None, {"IMAGE_MODEL": "env-model"}), "env-model")
        for env in ({}, {"IMAGE_MODEL": ""}, {"IMAGE_MODEL": "   "}):
            with self.subTest(env=env):
                err = io.StringIO()
                with contextlib.redirect_stderr(err), self.assertRaises(SystemExit) as ctx:
                    gen.resolve_model(None, env)
                self.assertEqual(ctx.exception.code, 2)
                self.assertIn("--model", err.getvalue())
                self.assertIn("IMAGE_MODEL", err.getvalue())
                self.assertIn("docs", err.getvalue())

        # Through main: no flag and no IMAGE_MODEL -> exit 2 before any provider call.
        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, stdout, stderr = run_main(
                ["--provider", "gemini", "--prompt", "a hero", "--out", str(self.tmp / "m.png")])
        self.assertEqual(code, 2)
        self.assertEqual(fake.calls, [])
        self.assertEqual(stdout, "")
        self.assertIn("IMAGE_MODEL", stderr)
        self.assertEqual(self.files_under(self.tmp), [])

    def test_no_image_returned_exits_1_and_writes_nothing(self):
        out = self.tmp / "mockups" / "mock.png"
        for label, fake in (("empty reply", FakeAdapter([])),
                            ("not an image", FakeAdapter([png_bytes("#C04040"), b"text, not pixels"]))):
            with self.subTest(label), mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
                code, stdout, stderr = run_main(
                    ["--provider", "gemini", "--model", "test-model", "--prompt", "a hero", "--out", str(out)])
                self.assertEqual(code, 1)
                self.assertEqual(len(fake.calls), 1)
                self.assertEqual(stdout, "")
                self.assertNotEqual(stderr.strip(), "")
                self.assertFalse(out.parent.exists(), "no output folder, image or sidecar may be written")
        self.assertEqual(self.files_under(self.tmp), [])

    def test_secret_in_environment_never_reaches_sidecar_stdout_or_stderr(self):
        secret = "SECRET123"
        env = {"GEMINI_API_KEY": secret, "OPENAI_API_KEY": secret, "IMAGE_MODEL": "test-model"}
        out = self.tmp / "mock.png"
        args = ["--provider", "gemini", "--prompt", "a hero", "--n", "5", "--out", str(out)]

        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, stdout, stderr = run_main(args, env)
        self.assertEqual(code, 0)
        sidecar = (self.tmp / "mock.json").read_text(encoding="utf-8")
        self.assertEqual(set(json.loads(sidecar)), SIDECAR_KEYS)
        self.assertEqual(json.loads(sidecar)["model"], "test-model")
        for name, text in (("sidecar", sidecar), ("stdout", stdout), ("stderr", stderr)):
            self.assertNotIn(secret, text, f"secret leaked into {name}")
        self.assertNotIn(secret, out.read_bytes().decode("latin-1"))

        # A provider error that echoes the key is redacted before it reaches stderr.
        failing = FakeAdapter(error=RuntimeError(f"401 invalid api key {secret}"))
        with mock.patch.dict(gen.ADAPTERS, {"gemini": failing}):
            code, stdout, stderr = run_main(args + ["--out", str(self.tmp / "other.png")], env)
        self.assertEqual(code, 1)
        self.assertNotIn(secret, stdout + stderr)
        self.assertIn("401", stderr)
        self.assertFalse((self.tmp / "other.png").exists())
        self.assertFalse((self.tmp / "other.json").exists())

    def test_multiple_outputs_are_numbered_and_one_sidecar_written(self):
        prompt_file = self.tmp / "v1.md"
        prompt_file.write_text("A dusk-lit hero for a ledger app.\n", encoding="utf-8")
        ref = self.tmp / "wire.png"
        Image.new("RGB", (160, 100), "#808080").save(ref)
        out = self.tmp / "mockups" / "v1" / "mock.png"
        colors = ["#C04040", "#40C040", "#4040C0"]
        fake = FakeAdapter([png_bytes(c) for c in colors])
        with mock.patch.dict(gen.ADAPTERS, {"openai": fake}):
            code, stdout, stderr = run_main(
                ["--provider", "openai", "--model", "test-model", "--prompt", str(prompt_file),
                 "--ref", str(ref), "--aspect", "9:16", "--n", "3", "--out", str(out)])
        self.assertEqual(code, 0, stderr)

        self.assertEqual(fake.calls, [{"model": "test-model", "prompt": "A dusk-lit hero for a ledger app.\n",
                                       "refs": [ref], "aspect": "9:16", "n": 3}])
        expected = [out.with_name(f"mock-{i}.png") for i in (1, 2, 3)]
        self.assertEqual(stdout.splitlines(), [str(p) for p in expected])
        self.assertEqual(self.files_under(out.parent), sorted(expected + [out.with_name("mock.json")]))
        self.assertFalse(out.exists())
        for p, color in zip(expected, colors):
            with Image.open(p) as im:
                self.assertEqual(im.convert("RGB").getpixel((0, 0)), Image.new("RGB", (1, 1), color).getpixel((0, 0)))

        meta = json.loads(out.with_name("mock.json").read_text(encoding="utf-8"))
        self.assertEqual(set(meta), SIDECAR_KEYS)
        self.assertEqual(meta["model"], "test-model")
        self.assertEqual(meta["provider"], "openai")
        self.assertEqual(meta["aspect"], "9:16")
        self.assertEqual(meta["refs"], [str(ref)])
        self.assertEqual(meta["prompt"], "A dusk-lit hero for a ledger app.\n")
        self.assertEqual(meta["outputs"], [str(p) for p in expected])
        self.assertTrue(meta["created_at"].endswith("+00:00"), meta["created_at"])

    def test_single_output_goes_to_out_and_n_above_four_warns_without_blocking(self):
        out = self.tmp / "mock.png"
        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, stdout, stderr = run_main(
                ["--provider", "gemini", "--model", "test-model", "--prompt", "literal prompt text",
                 "--n", "5", "--out", str(out)])
        self.assertEqual(code, 0, stderr)
        self.assertEqual(fake.calls[0]["n"], 5)
        self.assertEqual(fake.calls[0]["prompt"], "literal prompt text")
        self.assertEqual(fake.calls[0]["aspect"], "16:9")
        self.assertEqual(stdout.splitlines(), [str(out)])
        self.assertTrue(out.is_file())
        self.assertIn("confirm", stderr.lower())
        self.assertEqual(json.loads((self.tmp / "mock.json").read_text(encoding="utf-8"))["outputs"], [str(out)])

        # --n 4 or fewer: no warning.
        with mock.patch.dict(gen.ADAPTERS, {"gemini": FakeAdapter([png_bytes("#C04040")])}):
            code, _, stderr = run_main(
                ["--provider", "gemini", "--model", "test-model", "--prompt", "x", "--n", "4",
                 "--out", str(self.tmp / "b.png")])
        self.assertEqual(code, 0)
        self.assertNotIn("confirm", stderr.lower())

        # A long literal prompt (longer than any file name) is text, not a path lookup that crashes.
        long_prompt = "a calm dashboard hero, " * 40
        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, _, stderr = run_main(
                ["--provider", "gemini", "--model", "test-model", "--prompt", long_prompt,
                 "--out", str(self.tmp / "c.png")])
        self.assertEqual(code, 0, stderr)
        self.assertEqual(fake.calls[0]["prompt"], long_prompt)

    def test_missing_prompt_file_exits_2_and_never_calls_the_adapter(self):
        out = self.tmp / "mockups" / "mock.png"
        for arg in ("design/obs/prompts/v1-dsk.md", str(self.tmp / "prompts" / "v1-control.md"),
                    "v1-dsk.md", "notes.txt", "prompts/hero", "prompts\\hero"):
            fake = FakeAdapter([png_bytes("#C04040")])
            with self.subTest(arg), mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
                code, stdout, stderr = run_main(
                    ["--provider", "gemini", "--model", "test-model", "--prompt", arg, "--out", str(out)])
                self.assertEqual(code, 2)
                self.assertEqual(fake.calls, [])
                self.assertEqual(stdout, "")
                self.assertIn(f"prompt file not found: {arg}", stderr)
        self.assertEqual(self.files_under(self.tmp), [])

    def test_literal_prompt_text_still_passes_through(self):
        for literal in ("x", "hero", "neon", "a hero at dusk, see prompts/v1.md for tone",
                        "a calm dashboard hero, " * 40):
            fake = FakeAdapter([png_bytes("#C04040")])
            with self.subTest(literal[:30]), mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
                code, _, stderr = run_main(
                    ["--provider", "gemini", "--model", "test-model", "--prompt", literal,
                     "--out", str(self.tmp / "lit.png")])
                self.assertEqual(code, 0, stderr)
                self.assertEqual(fake.calls[0]["prompt"], literal)

    def test_openai_unsupported_aspect_exits_2_listing_supported_ones_before_any_call(self):
        for aspect in ("16:10", "4:5", "21:9"):
            fake = FakeAdapter([png_bytes("#C04040")])
            out = self.tmp / "mock.png"
            with self.subTest(aspect), mock.patch.dict(gen.ADAPTERS, {"openai": fake}):
                code, stdout, stderr = run_main(
                    ["--provider", "openai", "--model", "test-model", "--prompt", "a hero",
                     "--aspect", aspect, "--out", str(out)])
                self.assertEqual(code, 2)
                self.assertEqual(fake.calls, [])
                self.assertEqual(stdout, "")
                self.assertIn(aspect, stderr)
                for supported in gen.OPENAI_SIZES:
                    self.assertIn(supported, stderr)
        self.assertEqual(self.files_under(self.tmp), [])

        # Every supported aspect still reaches the adapter.
        for aspect in gen.OPENAI_SIZES:
            fake = FakeAdapter([png_bytes("#C04040")])
            with self.subTest(aspect), mock.patch.dict(gen.ADAPTERS, {"openai": fake}):
                code, _, stderr = run_main(
                    ["--provider", "openai", "--model", "test-model", "--prompt", "a hero",
                     "--aspect", aspect, "--out", str(self.tmp / "ok.png")])
                self.assertEqual(code, 0, stderr)
                self.assertEqual(fake.calls[0]["aspect"], aspect)

        # The gemini path is unchanged: the aspect goes to the provider as given.
        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, _, stderr = run_main(
                ["--provider", "gemini", "--model", "test-model", "--prompt", "a hero",
                 "--aspect", "16:10", "--out", str(self.tmp / "g.png")])
        self.assertEqual(code, 0, stderr)
        self.assertEqual(fake.calls[0]["aspect"], "16:10")

    def test_missing_reference_file_exits_2(self):
        missing = self.tmp / "refs" / "nope.jpg"
        out = self.tmp / "out" / "mock.png"
        fake = FakeAdapter([png_bytes("#C04040")])
        with mock.patch.dict(gen.ADAPTERS, {"gemini": fake}):
            code, stdout, stderr = run_main(
                ["--provider", "gemini", "--model", "test-model", "--prompt", "a hero",
                 "--ref", str(missing), "--out", str(out)])
        self.assertEqual(code, 2)
        self.assertEqual(fake.calls, [])
        self.assertEqual(stdout, "")
        self.assertIn(str(missing), stderr)
        self.assertEqual(self.files_under(self.tmp), [])

    def test_missing_sdk_exits_2_with_install_hint(self):
        # Mapping a module to None makes `import` raise ImportError, even where the SDK is installed,
        # so the real adapters run without any network.
        blocked = {"google": None, "google.genai": None, "google.genai.types": None, "openai": None}
        for provider, hint in (("gemini", "pip install google-genai"), ("openai", "pip install openai")):
            with self.subTest(provider), mock.patch.dict(sys.modules, blocked):
                out = self.tmp / provider / "mock.png"
                code, stdout, stderr = run_main(
                    ["--provider", provider, "--model", "test-model", "--prompt", "a hero", "--out", str(out)],
                    {"GEMINI_API_KEY": "SECRET123", "OPENAI_API_KEY": "SECRET123"})
                self.assertEqual(code, 2)
                self.assertEqual(stdout, "")
                self.assertIn(hint, stderr)
                self.assertNotIn("SECRET123", stderr)
        self.assertEqual(self.files_under(self.tmp), [])

    def test_cli_help_and_no_default_model(self):
        env = {k: v for k, v in os.environ.items() if k != "IMAGE_MODEL"}
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        help_run = subprocess.run([sys.executable, str(SCRIPTS / "generate.py"), "--help"],
                                  capture_output=True, text=True, env=env)
        self.assertEqual(help_run.returncode, 0)
        self.assertIn("--model", help_run.stdout)
        no_model = subprocess.run([sys.executable, str(SCRIPTS / "generate.py"), "--provider", "openai",
                                   "--prompt", "x", "--out", str(self.tmp / "m.png")],
                                  capture_output=True, text=True, env=env)
        self.assertEqual(no_model.returncode, 2)
        self.assertEqual(no_model.stdout, "")
        self.assertIn("IMAGE_MODEL", no_model.stderr)
        self.assertEqual(self.files_under(self.tmp), [])


if __name__ == "__main__":
    unittest.main()
