/**
 * Smoke test: the REST discovery path against the REAL ClickUp API.
 * GATED: skipped unless CLICKUP_API_TOKEN is set. Read-only (GET requests only).
 *
 * Assertions check shapes with boolean and typeof results only, so a failure
 * message can never print a real name, id or email. Nothing fetched here is
 * logged or snapshotted.
 */
import { describe, it, expect } from "vitest";
import { readClickUpToken } from "../src/env.js";
import { createRestInitApi, type ClickUpInitApi } from "../src/init-api.js";
import { mapStatuses } from "../src/status-map.js";

const TOKEN = readClickUpToken();
/** Real network calls: one per space plus a few more; well above any healthy run. */
const LIVE_TIMEOUT_MS = 120_000;

const isNonEmptyString = (v: unknown): boolean => typeof v === "string" && v.length > 0;
const isDigitString = (v: unknown): boolean => typeof v === "string" && /^[0-9]+$/.test(v);

describe.skipIf(!TOKEN)("ClickUp REST discovery smoke (real API, read-only)", () => {
  // The default fetch (globalThis.fetch) is the one a terminal init uses.
  const api = (): ClickUpInitApi => createRestInitApi(TOKEN ?? "");

  it(
    "workspaces, lists, statuses and members have the expected shapes",
    async () => {
      const rest = api();

      const workspaces = await rest.getWorkspaces();
      expect(Array.isArray(workspaces)).toBe(true);
      expect(workspaces.length > 0).toBe(true);
      expect(workspaces.every((w) => isDigitString(w.id) && typeof w.name === "string")).toBe(true);
      const workspaceId = workspaces[0]?.id ?? "";

      const lists = await rest.getLists(workspaceId);
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length > 0).toBe(true);
      expect(
        lists.every(
          (l) =>
            isDigitString(l.id) &&
            isNonEmptyString(l.name) &&
            isDigitString(l.space.id) &&
            typeof l.space.name === "string" &&
            (l.folder === undefined ||
              (isDigitString(l.folder.id) && typeof l.folder.name === "string")),
        ),
      ).toBe(true);
      // ClickUp's hidden container never surfaces as a folder.
      expect(lists.every((l) => l.folder?.name !== "hidden")).toBe(true);

      const statuses = await rest.getListStatuses(lists[0]?.id ?? "");
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length > 0).toBe(true);
      expect(
        statuses.every(
          (s) =>
            isNonEmptyString(s.status) &&
            ["open", "custom", "done", "closed"].includes(s.type) &&
            (s.orderindex === undefined || Number.isFinite(s.orderindex)),
        ),
      ).toBe(true);
      const mapped = mapStatuses(statuses);
      expect("error" in mapped).toBe(false);

      const members = await rest.getMembers(workspaceId);
      expect(Array.isArray(members)).toBe(true);
      expect(members.length > 0).toBe(true);
      expect(
        members.every(
          (m) =>
            isDigitString(m.id) &&
            isNonEmptyString(m.name) &&
            (m.email === undefined || typeof m.email === "string"),
        ),
      ).toBe(true);
      expect(new Set(members.map((m) => m.id)).size === members.length).toBe(true);
    },
    LIVE_TIMEOUT_MS,
  );
});
