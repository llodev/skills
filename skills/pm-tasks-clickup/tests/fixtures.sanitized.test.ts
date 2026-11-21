import { afterEach, describe, it, expect, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, "fixtures");

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const ALLOWED_EMAIL = "user@example.com";
const PERSONAL_TOKEN = /pk_\d+_/i;
const ATTACHMENTS_HOST = /attachments\.clickup\.com/;

// Read at call time so a token exported in the shell is checked too. The value
// is never put in a finding, so a leak never echoes the token into test output.
function tokenFromEnv(): string | undefined {
  const raw = process.env.CLICKUP_API_TOKEN?.trim();
  if (!raw) return undefined;
  const unquoted = raw.replace(/^(["'])(.*)\1$/, "$2");
  return unquoted || undefined;
}

function findLeaks(text: string): string[] {
  const leaks: string[] = [];
  for (const match of text.matchAll(EMAIL)) {
    if (match[0] !== ALLOWED_EMAIL) leaks.push(`email ${match[0]}`);
  }
  if (PERSONAL_TOKEN.test(text)) leaks.push("personal API token prefix (pk_<id>_)");
  if (ATTACHMENTS_HOST.test(text)) leaks.push("attachments.clickup.com URL");
  const token = tokenFromEnv();
  if (token && text.includes(token)) leaks.push("value of CLICKUP_API_TOKEN");
  return leaks;
}

async function listFixtures(): Promise<string[]> {
  try {
    const entries = await readdir(FIXTURES_DIR, { recursive: true });
    return entries.filter((rel) => rel.endsWith(".json")).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

describe("fixture sanitizer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detector flags planted personal data and token values", () => {
    expect(findLeaks('{"email":"someone@company.io"}')).toEqual(["email someone@company.io"]);
    expect(findLeaks('{"note":"pk_123456_abc"}')).toHaveLength(1);
    expect(findLeaks('{"profilePicture":"https://attachments.clickup.com/x.png"}')).toHaveLength(1);

    vi.stubEnv("CLICKUP_API_TOKEN", "fake-detector-token-0001");
    expect(findLeaks('{"note":"fake-detector-token-0001"}')).toEqual([
      "value of CLICKUP_API_TOKEN",
    ]);

    vi.stubEnv("CLICKUP_API_TOKEN", '"fake-detector-token-0002"');
    expect(findLeaks('{"note":"fake-detector-token-0002"}')).toEqual([
      "value of CLICKUP_API_TOKEN",
    ]);
  });

  it("detector allows the synthetic email and clean text", () => {
    vi.stubEnv("CLICKUP_API_TOKEN", "fake-detector-token-0003");
    expect(findLeaks('{"email":"user@example.com","id":"9013000001"}')).toEqual([]);
    expect(findLeaks('{"a":"user@example.com","b":"other@example.org"}')).toEqual([
      "email other@example.org",
    ]);
  });

  it("fixtures contain no personal data", async () => {
    const findings: string[] = [];
    for (const rel of await listFixtures()) {
      const text = await readFile(path.join(FIXTURES_DIR, rel), "utf8");
      for (const leak of findLeaks(text)) findings.push(`${rel}: ${leak}`);
    }
    expect(findings).toEqual([]);
  });
});
