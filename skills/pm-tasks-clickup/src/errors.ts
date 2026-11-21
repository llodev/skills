/**
 * Error helpers shared by the ClickUp transport verbs. Details carry the server
 * message only: request arguments (names, descriptions, tokens) are never echoed.
 */

import type { TransportErrorCode } from "@llodev/pm-tasks-core/runtime";

export interface TransportFailure {
  ok: false;
  code: TransportErrorCode;
  details: Record<string, unknown>;
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null) {
    const { error, message } = e as { error?: unknown; message?: unknown };
    if (typeof error === "string") return error;
    if (typeof message === "string") return message;
  }
  return String(e);
}

/**
 * Classify a thrown error (or a resolved `{error}` already turned into one by
 * `callTool`) into a TransportErrorCode. Status codes match as whole words, so an
 * id that merely contains "404" is not a 404. "Status does not exist" stays
 * MCP_ERROR here: the status verbs map it to INVALID_REQUEST `status_rejected`.
 */
export function classifyError(e: unknown): {
  code: TransportErrorCode;
  details: Record<string, unknown>;
} {
  const message = messageOf(e);
  const msg = message.toLowerCase();
  let code: TransportErrorCode = "MCP_ERROR";
  // ClickUp auth failures also read "not authorized", "Oauth token not found" or
  // carry an `OAUTH_<n>` code; checked before "not found" so they stay AUTH.
  if (
    /\b(401|403)\b/.test(msg) ||
    ["unauthorized", "forbidden", "not authorized", "token not found", "oauth_"].some((s) =>
      msg.includes(s),
    )
  ) {
    code = "AUTH_ERROR";
  } else if (/\b429\b/.test(msg) || msg.includes("rate limit")) {
    code = "RATE_LIMITED";
  } else if (/\b404\b/.test(msg) || msg.includes("not found")) {
    code = "NOT_FOUND";
  }
  return { code, details: { message } };
}

/** The MCP answered, but not with the shape the verb needs. */
export function shapeError(verb: string): TransportFailure {
  return {
    ok: false,
    code: "MCP_ERROR",
    details: { message: "ClickUp MCP returned an unexpected response shape", verb },
  };
}

/**
 * A request ClickUp cannot honor. `reason` is a stable machine-readable token.
 * `extra` carries ids and pinned status names from config or a task read (such
 * as `listId`, `status`, `role`), never request arguments; it cannot replace
 * `verb`, `reason` or `message`.
 */
export function invalidRequest(
  verb: string,
  reason: string,
  message: string,
  extra: Record<string, unknown> = {},
): TransportFailure {
  return { ok: false, code: "INVALID_REQUEST", details: { ...extra, verb, reason, message } };
}
