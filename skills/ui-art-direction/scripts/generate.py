#!/usr/bin/env python3
"""Generate mockup images from a prompt and reference images with a provider image model.

There is no default model: pass --model ID or set IMAGE_MODEL, picking a current ID from the provider's
docs. API keys are read only from the environment by the provider SDK (GEMINI_API_KEY for gemini,
OPENAI_API_KEY for openai) and are never printed or written. One image is saved to --out; several are
saved as <stem>-1<suffix>, <stem>-2<suffix>, ... Each run writes one sidecar <stem>.json beside --out
with model, provider, aspect, refs, prompt, outputs and created_at. Prints the output paths.

This is the only script that contacts a network, and every run is a paid call: confirm counts with the
user before raising --n.
"""
from __future__ import annotations

import argparse
import base64
import io
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True  # the local imports below must not write __pycache__ into the installed skill

from _common import fail, write_sidecar  # noqa: E402

from PIL import Image, UnidentifiedImageError  # noqa: E402

PROVIDER_DOCS = {
    "gemini": "https://ai.google.dev/gemini-api/docs/image-generation",
    "openai": "https://platform.openai.com/docs/guides/image-generation",
}
OPENAI_SIZES = {"16:9": "1536x1024", "3:2": "1536x1024", "1:1": "1024x1024", "9:16": "1024x1536", "2:3": "1024x1536"}
CONFIRM_ABOVE_N = 4
SECRET_NAME = re.compile(r"KEY|TOKEN|SECRET|PASSWORD", re.IGNORECASE)


class MissingSDK(Exception):
    """The provider SDK is not installed; the message carries the install command."""


def _load_refs(refs: list) -> list:
    images = []
    for p in refs:
        with Image.open(p) as im:
            im.load()
            images.append(im.copy())
    return images


def _gemini(model: str, prompt: str, refs: list, aspect: str, n: int) -> list[bytes]:
    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise MissingSDK("the gemini provider needs the Google Gen AI SDK: pip install google-genai") from e

    client = genai.Client()  # reads GEMINI_API_KEY from the environment
    contents: list = [prompt] + _load_refs(refs)
    images: list[bytes] = []
    for _ in range(n):
        resp = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=aspect),
            ),
        )
        for candidate in getattr(resp, "candidates", None) or []:  # a safety block may return no candidates
            content = getattr(candidate, "content", None)
            for part in getattr(content, "parts", None) or []:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    images.append(part.inline_data.data)
    return images


def _openai(model: str, prompt: str, refs: list, aspect: str, n: int) -> list[bytes]:
    try:
        from openai import OpenAI
    except ImportError as e:
        raise MissingSDK("the openai provider needs the OpenAI SDK: pip install openai") from e

    client = OpenAI()  # reads OPENAI_API_KEY from the environment
    files = [open(p, "rb") for p in refs]
    try:
        kwargs = dict(model=model, prompt=prompt, n=n, size=OPENAI_SIZES[aspect])  # main() rejects others
        resp = client.images.edit(image=files, **kwargs) if files else client.images.generate(**kwargs)
    finally:
        for f in files:
            f.close()
    return [base64.b64decode(d.b64_json) for d in (resp.data or []) if getattr(d, "b64_json", None)]


ADAPTERS: dict = {"gemini": _gemini, "openai": _openai}


def resolve_model(cli_model: str | None, env) -> str:
    """The --model flag, else IMAGE_MODEL; with neither, print where to find an ID and exit 2."""
    model = (cli_model or "").strip() or (env.get("IMAGE_MODEL") or "").strip()
    if model:
        return model
    docs = "; ".join(f"{name}: {url}" for name, url in PROVIDER_DOCS.items())
    print("no image model given: pass --model ID or set IMAGE_MODEL. There is no default, because model IDs "
          f"change often; pick a current one from the provider docs ({docs}).", file=sys.stderr)
    raise SystemExit(2)


def generate(provider: str, model: str, prompt: str, refs: list, aspect: str, n: int) -> list[bytes]:
    """Call the provider adapter and return the raw image bytes it produced (possibly none)."""
    adapter = ADAPTERS.get(provider)
    if adapter is None:
        raise ValueError(f"unknown provider: {provider}")
    return adapter(model, prompt, [Path(p) for p in refs], aspect, n)


def save_outputs(images: list[bytes], out, meta: dict) -> list:
    """Decode every image first, then write them and one sidecar; return the written paths as strings.

    Raises ValueError when there is no image and OSError (UnidentifiedImageError) when bytes are not an
    image, in both cases before anything is written. The sidecar keeps only the pinned fields.
    """
    if not images:
        raise ValueError("no image to save")
    decoded = []
    for data in images:
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            decoded.append(im.copy())
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    written = []
    for i, im in enumerate(decoded):
        target = out if len(decoded) == 1 else out.with_name(f"{out.stem}-{i + 1}{out.suffix}")
        if target.suffix.lower() in (".jpg", ".jpeg") and im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(target)
        written.append(str(target))
    write_sidecar(out, {
        "model": meta.get("model"),
        "provider": meta.get("provider"),
        "aspect": meta.get("aspect"),
        "refs": [str(p) for p in meta.get("refs", [])],
        "prompt": meta.get("prompt"),
        "outputs": written,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    })
    return written


def _redact(text: str) -> str:
    """Replace the value of every secret-looking environment variable found in `text`."""
    for name, value in os.environ.items():
        if SECRET_NAME.search(name) and len(value) >= 6 and value in text:
            text = text.replace(value, "[redacted]")
    return text


def _is_file(candidate: str) -> bool:
    try:
        return Path(candidate).is_file()
    except (OSError, ValueError):  # a long literal prompt can exceed the file-name limit
        return False


def _looks_like_path(candidate: str) -> bool:
    """No whitespace, and a path separator or a .md / .txt ending: a typo here must not become a paid call."""
    if not candidate or any(c.isspace() for c in candidate):
        return False
    return "/" in candidate or "\\" in candidate or candidate.lower().endswith((".md", ".txt"))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--provider", required=True, choices=sorted(ADAPTERS), help="image backend")
    ap.add_argument("--model", help="model ID from the provider docs (or env IMAGE_MODEL); no default")
    ap.add_argument("--prompt", required=True,
                    help="prompt file path, or the prompt text itself; a path-like value (no spaces, with a / or "
                         "ending in .md or .txt) that is not a file exits 2")
    ap.add_argument("--ref", action="append", default=[], help="reference image (repeat the flag)")
    ap.add_argument("--aspect", default="16:9",
                    help="aspect ratio, e.g. 16:9, 1:1, 9:16 (default 16:9); openai accepts only "
                         + ", ".join(OPENAI_SIZES))
    ap.add_argument("--n", type=int, default=1, help="number of images (default 1; above 4, confirm first)")
    ap.add_argument("--out", required=True, help="output PNG; several images are numbered -1, -2, ...")
    args = ap.parse_args(argv)

    if args.n < 1:
        return fail(f"--n must be at least 1, got {args.n}", 2)
    if args.provider == "openai" and args.aspect not in OPENAI_SIZES:
        return fail(f"--aspect {args.aspect} is not supported by the openai provider; use one of: "
                    + ", ".join(OPENAI_SIZES), 2)
    out = Path(args.out)
    if out.suffix.lower() not in Image.registered_extensions():
        return fail(f"--out needs an image extension such as .png, got {out}", 2)
    for p in args.ref:
        if not Path(p).is_file():
            return fail(f"reference not found: {p}", 2)
        try:
            with Image.open(p) as im:
                im.verify()
        except (UnidentifiedImageError, OSError) as e:
            return fail(f"reference is not a readable image: {p} ({e})", 2)
    if not _is_file(args.prompt) and _looks_like_path(args.prompt):
        return fail(f"prompt file not found: {args.prompt}", 2)
    try:
        prompt = Path(args.prompt).read_text(encoding="utf-8") if _is_file(args.prompt) else args.prompt
    except (OSError, UnicodeDecodeError) as e:
        return fail(f"could not read the prompt file {args.prompt}: {e}", 2)
    if not prompt.strip():
        return fail("the prompt is empty", 2)
    try:
        model = resolve_model(args.model, os.environ)
    except SystemExit as e:
        return e.code
    if args.n > CONFIRM_ABOVE_N:
        print(f"--n {args.n} requests {args.n} paid images: confirm the count and cost with the user "
              "before running this.", file=sys.stderr)

    try:
        images = generate(args.provider, model, prompt, args.ref, args.aspect, args.n)
    except MissingSDK as e:
        return fail(str(e), 2)
    except Exception as e:  # provider, network or auth failure; the message may echo request details
        return fail(_redact(f"{args.provider} request failed: {type(e).__name__}: {e}"), 1)
    if not images:
        return fail("the model returned no image (safety block or a text-only reply); nothing was written. "
                    "Revise the prompt or references and try again.", 1)
    try:
        written = save_outputs(images, out, {"model": model, "provider": args.provider, "aspect": args.aspect,
                                             "refs": args.ref, "prompt": prompt})
    except (UnidentifiedImageError, ValueError) as e:
        return fail(f"the provider reply is not a readable image; nothing was written ({e})", 1)
    except OSError as e:
        return fail(f"could not write {out}: {e}", 1)
    print("\n".join(written))
    return 0


if __name__ == "__main__":
    sys.exit(main())
