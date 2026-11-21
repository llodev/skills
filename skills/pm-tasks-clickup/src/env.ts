/** Environment input shared by `init` and `doctor`. The token is never logged or stored. */

/** Trim, then drop ONE pair of matching surrounding quotes: `"x"` or `'x'` → `x`. */
export function stripEnvQuotes(v: string): string {
  return v.trim().replace(/^(['"])(.*)\1$/, "$2");
}

/** `CLICKUP_API_TOKEN`, unquoted and trimmed; undefined when unset or empty. */
export function readClickUpToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = stripEnvQuotes(env.CLICKUP_API_TOKEN ?? "").trim();
  return token === "" ? undefined : token;
}
