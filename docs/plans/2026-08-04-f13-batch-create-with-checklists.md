# F13 — Batch card+checklist creation (Trello) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed, parallelized batch create-cards-with-checklists capability to the Trello adapter so large plans publish ~10× faster, delivered as the custom namespaced verb `trello.task.batch-create-with-checklists` plus a parallelized `publish.md` instruction for the agent-driven path.

**Architecture:** Everything lands **inside `skills/pm-tasks-trello`** — no `pm-tasks-core` change, so no core release and no `contract.md` edit. The Trello transport gains a Trello-local `createChecklists` method (extension type `TrelloTransport = Transport & { createChecklists }`); a new orchestrator fans out over cards with a hand-rolled concurrency cap, reusing the already-audited `runtime.taskCreate` for each card and calling `createChecklists` for the checklists. `createAdapter` exposes it as `trelloBatchCreateWithChecklists` on a `TrelloAdapter = Runtime & { … }` return. The verb is declared in `manifest.json` + `SKILL.md` (satisfies `contract-check` Phase B) and added to the `autonomous.allow` config enum so it is gateable in autonomous mode.

**Tech Stack:** TypeScript (ESM, NodeNext), vitest, Changesets, pnpm workspace. No new runtime dependencies (size-limit budget).

## Global Constraints

- **No `pm-tasks-core` changes.** F13 is a custom adapter verb — implement entirely in `skills/pm-tasks-trello`. Do **not** touch `skills/pm-tasks-core/references/contract.md` (any edit trips `contract-check` Phase A → forces a core MAJOR).
- **No new runtime dependencies.** Concurrency is hand-rolled; `.size-limit.json` budget for `@llodev/pm-tasks-trello` is **10 kB** gzip on `dist/**/*.js` — stay under it.
- **Custom verb name (exact):** `trello.task.batch-create-with-checklists`. Must be namespaced with the manifest `tool` value (`trello.`) and must appear **literally** in `SKILL.md` (both enforced by `scripts/checks/contract-check.mjs`).
- **MCP param conformance:** checklist calls use `mcp__trello__trello_create_checklist { cardId, name }` and `mcp__trello__trello_create_check_item { checklistId, name }` — copy these key names verbatim (Trello MCP is `additionalProperties:false`; a wrong key is fatal). Confirm against the live tool schema during dogfood. **Verified live (2026-08-04):** `create_card` requires `idList` (NOT `listId`), and `trello_create_checklist` **does** expose an optional `idChecklistSource` (clone-from-existing) param — see the `listId`→`idList` note in Verification and the `idChecklistSource` note in "What comes after".
- **Rate limit:** Trello allows 300 req/10s per key. Default concurrency cap = **8**; checklist creation is two-phase (all checklists, then all items) so in-flight calls per phase stay ≤ cap.
- **Release:** one PR = one changeset = one release. Branch `pmt-trello-v1.10.0`; minor bump of `@llodev/pm-tasks-trello` only. PR title: `feat(release): trello v1.10.0 — F13 batch create-with-checklists`.

---

## File Structure

**Create (all under `skills/pm-tasks-trello/`):**

- `src/concurrency.ts` — `mapWithConcurrency` bounded-parallel helper (pure, no deps).
- `src/batch.ts` — batch types only (no runtime imports): `ChecklistInput`, `ChecklistResult`, `BatchCardInput`, `BatchCreateRequest`, `BatchCardResult`, `BatchCreateResult`.
- `src/batch-create.ts` — `batchCreateWithChecklists` orchestrator (imports `Runtime` type, `TrelloTransport` type, batch types, `mapWithConcurrency`).
- `tests/concurrency.test.ts` — unit tests for the helper.
- `tests/batch.test.ts` — unit tests for `createChecklists` (transport) + `batchCreateWithChecklists` (orchestrator).

**Modify:**

- `src/transport-trello.ts` — add `createChecklists`; export `TrelloTransport` type; change factory return type.
- `src/adapter.ts` — wire orchestrator; return `TrelloAdapter`.
- `src/index.ts` — export new types + orchestrator.
- `manifest.json` — add the custom verb to `verbs[]`.
- `schemas/config.json` — add the verb to `autonomous.allow.items.enum`.
- `references/operations.md` — add the verb to the verb→MCP table + result-envelope table.
- `references/publish.md` — parallelize Step 2 (agent-path facet).
- `SKILL.md` — document the verb (literal string) + a one-line usage note.

**Regenerate / release artifacts (repo root):**

- `scripts/snapshots/tarball-snapshot.json` — `pm-tasks-trello` array (new `dist` files).
- `.size-limit.json` — verify/bump the trello 10 kB budget.
- `scripts/snapshots/skill-judge-baseline.json` — ratchet trello entry after SKILL.md edit.
- `.changeset/<name>.md` — the minor changeset.

---

### Task 1: Bounded-concurrency helper

**Files:**

- Create: `skills/pm-tasks-trello/src/concurrency.ts`
- Test: `skills/pm-tasks-trello/tests/concurrency.test.ts`

**Interfaces:**

- Produces: `mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>` — resolves in input order, never runs more than `max(1, limit)` `fn` calls at once.

- [ ] **Step 1: Write the failing test**

```ts
// skills/pm-tasks-trello/tests/concurrency.test.ts
import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "../src/concurrency.js";

describe("mapWithConcurrency", () => {
  it("preserves input order in results", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async (n) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return n;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("returns [] for empty input", async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @llodev/pm-tasks-trello test concurrency`
Expected: FAIL — `mapWithConcurrency` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// skills/pm-tasks-trello/src/concurrency.ts
/**
 * Run `fn` over `items` with at most `limit` concurrent calls.
 * Results are returned in input order. No external dependency — a small
 * worker-pool over a shared cursor keeps the Trello adapter within its
 * size-limit budget.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @llodev/pm-tasks-trello test concurrency`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/pm-tasks-trello/src/concurrency.ts skills/pm-tasks-trello/tests/concurrency.test.ts
git commit -m "feat(trello): add bounded-concurrency map helper for F13"
```

---

### Task 2: Batch types + transport `createChecklists`

**Files:**

- Create: `skills/pm-tasks-trello/src/batch.ts`
- Modify: `skills/pm-tasks-trello/src/transport-trello.ts`
- Test: `skills/pm-tasks-trello/tests/batch.test.ts` (create; `createChecklists` cases only in this task)

**Interfaces:**

- Consumes: `mapWithConcurrency` (Task 1); `TransportErrorCode`, `TransportResult` from `@llodev/pm-tasks-core/runtime`; `isObjectWith` / `classifyError` already in `transport-trello.ts`.
- Produces:
  - `interface ChecklistInput { name: string; items: string[] }`
  - `interface ChecklistResult { id: string; name: string; items: { id: string; name: string }[] }`
  - `type TrelloTransport = Transport & { createChecklists(cardId: string, checklists: readonly ChecklistInput[], concurrency?: number): Promise<TransportResult<ChecklistResult[]>> }`
  - `createTrelloTransport(opts): TrelloTransport` (widened return type).

- [ ] **Step 1: Write the batch types (no test — types only)**

```ts
// skills/pm-tasks-trello/src/batch.ts
import type { TransportErrorCode } from "@llodev/pm-tasks-core/runtime";

/** One checklist to create on a card: a name plus flat item labels. */
export interface ChecklistInput {
  name: string;
  items: string[];
}

/** Created checklist with resolved native ids. */
export interface ChecklistResult {
  id: string;
  name: string;
  items: { id: string; name: string }[];
}

/** One card in a batch (superset of the fields the typed transport maps at create). */
export interface BatchCardInput {
  listOrSectionId: string;
  name: string;
  description?: string;
  dueDate?: string; // ISO 8601 (YYYY-MM-DD), maps to create_card `due`
  clientToken?: string; // idempotency marker (reuses task.create [ct:] convention)
  checklists?: ChecklistInput[];
}

export interface BatchCreateRequest {
  boardOrProjectId: string;
  cards: BatchCardInput[];
  concurrency?: number; // default 8
}

export interface BatchCardResult {
  ok: boolean;
  card?: { id: string; url?: string };
  checklists?: ChecklistResult[];
  error?: { code: TransportErrorCode; message?: string };
}

export interface BatchCreateResult {
  ok: boolean; // true iff every card succeeded (card + all checklists)
  created: number;
  failed: number;
  results: BatchCardResult[]; // input order
}
```

- [ ] **Step 2: Write the failing transport test**

```ts
// skills/pm-tasks-trello/tests/batch.test.ts
import { describe, it, expect } from "vitest";
import { createTrelloTransport, type McpCaller } from "../src/transport-trello.js";

interface CallRecord {
  tool: string;
  args: Record<string, unknown>;
}

/** Queue-per-tool recording stub: successive calls to the same tool pop the next response. */
function makeQueuedMcp(queues: Record<string, unknown[]>): { mcp: McpCaller; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const mcp: McpCaller = async (tool, args) => {
    calls.push({ tool, args });
    const q = queues[tool];
    if (!q || q.length === 0) throw new Error(`Unexpected MCP call: ${tool}`);
    const resp = q.shift();
    if (resp instanceof Error) throw resp;
    return resp;
  };
  return { mcp, calls };
}

describe("createTrelloTransport — createChecklists", () => {
  it("creates each checklist then its items, returning resolved ids", async () => {
    const { mcp, calls } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [{ id: "cl1" }],
      mcp__trello__trello_create_check_item: [{ id: "it1" }, { id: "it2" }],
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists(
      "cardA",
      [{ name: "Pre-flight", items: ["a", "b"] }],
      8,
    );
    expect(res).toEqual({
      ok: true,
      data: [
        {
          id: "cl1",
          name: "Pre-flight",
          items: [
            { id: "it1", name: "a" },
            { id: "it2", name: "b" },
          ],
        },
      ],
    });
    expect(calls[0]).toEqual({
      tool: "mcp__trello__trello_create_checklist",
      args: { cardId: "cardA", name: "Pre-flight" },
    });
    expect(calls.filter((c) => c.tool === "mcp__trello__trello_create_check_item")).toHaveLength(2);
    expect(calls[1].args).toEqual({ checklistId: "cl1", name: "a" });
  });

  it("classifies an MCP rate-limit error", async () => {
    const { mcp } = makeQueuedMcp({
      mcp__trello__trello_create_checklist: [new Error("Trello 429 rate limit")],
    });
    const transport = createTrelloTransport({ mcp });
    const res = await transport.createChecklists("cardA", [{ name: "X", items: [] }], 8);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("RATE_LIMITED");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @llodev/pm-tasks-trello test batch`
Expected: FAIL — `transport.createChecklists` is not a function / type error.

- [ ] **Step 4: Implement `createChecklists` + `TrelloTransport`**

In `skills/pm-tasks-trello/src/transport-trello.ts`:

Add imports near the top (after the existing `import type { … } from "@llodev/pm-tasks-core/runtime"`):

```ts
import { mapWithConcurrency } from "./concurrency.js";
import type { ChecklistInput, ChecklistResult } from "./batch.js";
```

Add the extension type after the `CreateTrelloTransportOptions` interface:

```ts
/** Trello transport plus Trello-only extension methods (F13). Not part of core Transport. */
export type TrelloTransport = Transport & {
  createChecklists(
    cardId: string,
    checklists: readonly ChecklistInput[],
    concurrency?: number,
  ): Promise<TransportResult<ChecklistResult[]>>;
};
```

Change the factory signature `export function createTrelloTransport(opts: CreateTrelloTransportOptions): Transport {` → `: TrelloTransport {`.

Add this method inside the returned object (after `taskCommentAdd`, before the closing `};`):

```ts
    // -------------------------------------------------------------------
    // F13. createChecklists (Trello extension) →
    //   mcp__trello__trello_create_checklist + trello_create_check_item
    //   Two-phase so in-flight calls per phase stay ≤ `concurrency`.
    // -------------------------------------------------------------------
    async createChecklists(cardId, checklists, concurrency = 8) {
      try {
        // Phase 1 — create every checklist (parallel, capped).
        const created = await mapWithConcurrency(checklists, concurrency, async (cl) => {
          const resp = await mcp("mcp__trello__trello_create_checklist", { cardId, name: cl.name });
          if (!isObjectWith(resp, "id") || typeof resp.id !== "string") {
            throw new Error("Trello create_checklist returned no id");
          }
          return { id: resp.id, name: cl.name, itemNames: cl.items };
        });

        // Phase 2 — create all items across all checklists (flattened, capped).
        const flat = created.flatMap((c) => c.itemNames.map((name) => ({ checklistId: c.id, name })));
        const itemRefs = await mapWithConcurrency(flat, concurrency, async (it) => {
          const ir = await mcp("mcp__trello__trello_create_check_item", {
            checklistId: it.checklistId,
            name: it.name,
          });
          const id = isObjectWith(ir, "id") && typeof ir.id === "string" ? ir.id : "";
          return { checklistId: it.checklistId, id, name: it.name };
        });

        // Regroup items under their checklist, preserving order.
        const data: ChecklistResult[] = created.map((c) => ({
          id: c.id,
          name: c.name,
          items: itemRefs.filter((r) => r.checklistId === c.id).map((r) => ({ id: r.id, name: r.name })),
        }));
        return { ok: true, data };
      } catch (e) {
        const { code, details } = classifyError(e);
        return { ok: false, code, details };
      }
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @llodev/pm-tasks-trello test batch`
Expected: PASS (2 `createChecklists` tests). Also run `pnpm --filter @llodev/pm-tasks-trello typecheck` — expect no errors.

- [ ] **Step 6: Commit**

```bash
git add skills/pm-tasks-trello/src/batch.ts skills/pm-tasks-trello/src/transport-trello.ts skills/pm-tasks-trello/tests/batch.test.ts
git commit -m "feat(trello): add typed createChecklists transport method (F13)"
```

---

### Task 3: Orchestrator + adapter exposure

**Files:**

- Create: `skills/pm-tasks-trello/src/batch-create.ts`
- Modify: `skills/pm-tasks-trello/src/adapter.ts`, `skills/pm-tasks-trello/src/index.ts`
- Test: `skills/pm-tasks-trello/tests/batch.test.ts` (add orchestrator cases)

**Interfaces:**

- Consumes: `Runtime` (core), `TrelloTransport` (Task 2), batch types (Task 2), `mapWithConcurrency` (Task 1).
- Produces:
  - `batchCreateWithChecklists(req: BatchCreateRequest, deps: { runtime: Runtime; transport: TrelloTransport }): Promise<BatchCreateResult>`
  - `type TrelloAdapter = Runtime & { trelloBatchCreateWithChecklists(req: BatchCreateRequest): Promise<BatchCreateResult> }`
  - `createAdapter(opts): Promise<TrelloAdapter>` (widened return type).

- [ ] **Step 1: Write the failing orchestrator test (append to `tests/batch.test.ts`)**

```ts
import { batchCreateWithChecklists } from "../src/batch-create.js";
import type { Runtime } from "@llodev/pm-tasks-core/runtime";
import type { TrelloTransport } from "../src/transport-trello.js";

describe("batchCreateWithChecklists — orchestrator", () => {
  it("creates each card via runtime.taskCreate then its checklists via transport", async () => {
    const created: string[] = [];
    const runtime = {
      taskCreate: async (req: { name: string }) => {
        created.push(req.name);
        return { ok: true as const, data: { id: `card-${req.name}`, url: `u/${req.name}` } };
      },
    } as unknown as Runtime;
    const transport = {
      createChecklists: async (cardId: string, cls: { name: string }[]) => ({
        ok: true as const,
        data: cls.map((c) => ({ id: `cl-${cardId}`, name: c.name, items: [] })),
      }),
    } as unknown as TrelloTransport;

    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "A", checklists: [{ name: "Pre-flight", items: [] }] },
          { listOrSectionId: "l", name: "B" },
        ],
      },
      { runtime, transport },
    );

    expect(created).toEqual(["A", "B"]);
    expect(res.ok).toBe(true);
    expect(res.created).toBe(2);
    expect(res.failed).toBe(0);
    expect(res.results[0]).toEqual({
      ok: true,
      card: { id: "card-A", url: "u/A" },
      checklists: [{ id: "cl-card-A", name: "Pre-flight", items: [] }],
    });
  });

  it("marks a card failed when runtime.taskCreate fails, without aborting the batch", async () => {
    const runtime = {
      taskCreate: async (req: { name: string }) =>
        req.name === "bad"
          ? { ok: false as const, code: "MCP_ERROR" as const, details: { message: "boom" } }
          : { ok: true as const, data: { id: `card-${req.name}` } },
    } as unknown as Runtime;
    const transport = {
      createChecklists: async () => ({ ok: true as const, data: [] }),
    } as unknown as TrelloTransport;

    const res = await batchCreateWithChecklists(
      {
        boardOrProjectId: "b",
        cards: [
          { listOrSectionId: "l", name: "bad" },
          { listOrSectionId: "l", name: "ok" },
        ],
      },
      { runtime, transport },
    );

    expect(res.ok).toBe(false);
    expect(res.created).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.results[0].ok).toBe(false);
    expect(res.results[0].error?.code).toBe("MCP_ERROR");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @llodev/pm-tasks-trello test batch`
Expected: FAIL — `batchCreateWithChecklists` not found.

- [ ] **Step 3: Implement the orchestrator**

```ts
// skills/pm-tasks-trello/src/batch-create.ts
import type { Runtime } from "@llodev/pm-tasks-core/runtime";
import type { TrelloTransport } from "./transport-trello.js";
import type { BatchCreateRequest, BatchCreateResult, BatchCardResult } from "./batch.js";
import { mapWithConcurrency } from "./concurrency.js";

function messageOf(details: Record<string, unknown> | undefined): string | undefined {
  const m = details?.message;
  return typeof m === "string" ? m : undefined;
}

/**
 * F13 — create many cards, each with its checklists, in bounded parallel.
 * Cards go through the audited canonical `runtime.taskCreate` (so autonomous
 * audit + idempotency are preserved); checklists go through the Trello
 * `createChecklists` extension. One card failing does not abort the batch.
 */
export async function batchCreateWithChecklists(
  req: BatchCreateRequest,
  deps: { runtime: Runtime; transport: TrelloTransport },
): Promise<BatchCreateResult> {
  const { runtime, transport } = deps;
  const concurrency = req.concurrency ?? 8;

  const results = await mapWithConcurrency(
    req.cards,
    concurrency,
    async (card): Promise<BatchCardResult> => {
      const createRes = await runtime.taskCreate({
        boardOrProjectId: req.boardOrProjectId,
        listOrSectionId: card.listOrSectionId,
        name: card.name,
        description: card.description,
        clientToken: card.clientToken,
        dueDate: card.dueDate,
      });
      if (!createRes.ok) {
        return {
          ok: false,
          error: { code: createRes.code, message: messageOf(createRes.details) },
        };
      }
      const cardRef = { id: createRes.data.id, url: createRes.data.url };

      if (!card.checklists || card.checklists.length === 0) {
        return { ok: true, card: cardRef, checklists: [] };
      }

      const clRes = await transport.createChecklists(cardRef.id, card.checklists, concurrency);
      if (!clRes.ok) {
        return {
          ok: false,
          card: cardRef,
          checklists: [],
          error: { code: clRes.code, message: messageOf(clRes.details) },
        };
      }
      return { ok: true, card: cardRef, checklists: clRes.data };
    },
  );

  const failed = results.filter((r) => !r.ok).length;
  return { ok: failed === 0, created: results.length - failed, failed, results };
}
```

- [ ] **Step 4: Wire it into `createAdapter`**

Replace the body of `skills/pm-tasks-trello/src/adapter.ts` with:

```ts
import { createCoreRuntime, type Runtime } from "@llodev/pm-tasks-core/runtime";
import { createTrelloTransport, type McpCaller } from "./transport-trello.js";
import { batchCreateWithChecklists } from "./batch-create.js";
import type { BatchCreateRequest, BatchCreateResult } from "./batch.js";

export interface CreateAdapterOptions {
  configPath: string;
  mcp: McpCaller;
  session?: string;
  language?: string;
}

/** Trello Runtime plus the F13 batch extension. */
export type TrelloAdapter = Runtime & {
  trelloBatchCreateWithChecklists(req: BatchCreateRequest): Promise<BatchCreateResult>;
};

export async function createAdapter(opts: CreateAdapterOptions): Promise<TrelloAdapter> {
  const transport = createTrelloTransport({ mcp: opts.mcp });
  const runtime = await createCoreRuntime({
    tool: "trello",
    configPath: opts.configPath,
    transport,
    session: opts.session,
    language: opts.language,
  });
  return {
    ...runtime,
    trelloBatchCreateWithChecklists: (req) =>
      batchCreateWithChecklists(req, { runtime, transport }),
  };
}
```

- [ ] **Step 5: Export from `src/index.ts`**

Replace `skills/pm-tasks-trello/src/index.ts` with:

```ts
export { createTrelloTransport } from "./transport-trello.js";
export type {
  McpCaller,
  CreateTrelloTransportOptions,
  TrelloTransport,
} from "./transport-trello.js";
export { createAdapter } from "./adapter.js";
export type { CreateAdapterOptions, TrelloAdapter } from "./adapter.js";
export { batchCreateWithChecklists } from "./batch-create.js";
export type {
  BatchCreateRequest,
  BatchCreateResult,
  BatchCardInput,
  BatchCardResult,
  ChecklistInput,
  ChecklistResult,
} from "./batch.js";
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter @llodev/pm-tasks-trello test && pnpm --filter @llodev/pm-tasks-trello typecheck`
Expected: PASS (all batch + concurrency + existing transport/adapter tests); no type errors.

- [ ] **Step 7: Commit**

```bash
git add skills/pm-tasks-trello/src/batch-create.ts skills/pm-tasks-trello/src/adapter.ts skills/pm-tasks-trello/src/index.ts skills/pm-tasks-trello/tests/batch.test.ts
git commit -m "feat(trello): expose trelloBatchCreateWithChecklists on adapter (F13)"
```

---

### Task 4: Declare the verb — manifest, config enum, operations doc, SKILL.md

**Files:**

- Modify: `skills/pm-tasks-trello/manifest.json`, `skills/pm-tasks-trello/schemas/config.json`, `skills/pm-tasks-trello/references/operations.md`, `skills/pm-tasks-trello/SKILL.md`

**Interfaces:** none (declaration + docs). This task makes `contract-check` and schema validation pass with the new verb present.

- [ ] **Step 1: Add the verb to `manifest.json`**

Append to the `verbs` array (after `"checklist.check"`):

```json
    "checklist.check",
    "trello.task.batch-create-with-checklists"
```

- [ ] **Step 2: Add the verb to the `autonomous.allow` enum**

In `skills/pm-tasks-trello/schemas/config.json`, add the string to the `autonomous.allow.items.enum` list (after `"task.comment.add"`):

```json
              "task.comment.add",
              "trello.task.batch-create-with-checklists"
```

- [ ] **Step 3: Document the verb in `operations.md`**

Add a row to the **Verb → MCP tool** table:

```
| `trello.task.batch-create-with-checklists` | `create_card` + `trello_create_checklist` + `trello_create_check_item` (bounded-parallel, cap 8) | `boardOrProjectId`, `cards[]` (`listOrSectionId`, `name`, `desc`, `due`, `clientToken`, `checklists[{name, items[]}]`). Custom Trello verb; see § batch below. |
```

Add a row to the **Result envelope** table:

```
| `trello.task.batch-create-with-checklists` | `{ ok, created, failed, results: [{ ok, card:{id,url}, checklists:[{id,name,items:[{id,name}]}], error? }] }` |
```

Add a short section at the end explaining: cards go through the audited `task.create` path; checklists are created two-phase (all checklists, then all items) with concurrency cap 8 to respect Trello's 300 req/10s limit; one card failing does not abort the batch; the speedup comes from parallelizing the existing POSTs. Note that `trello_create_checklist` **does** expose an optional `idChecklistSource` param (clone items from an existing checklist), but it is intentionally **not** used here — F13's cards carry distinct checklists, so cloning a single template does not apply; flag it as a future optimization for the same-template-across-many-cards case.

- [ ] **Step 4: Document the verb in `SKILL.md`**

Insert this subsection under the existing verb/CRUD documentation (adjust the heading level to match its neighbors). It **must** contain the literal string `trello.task.batch-create-with-checklists` — the `contract-check` grep fails otherwise:

```markdown
#### `trello.task.batch-create-with-checklists` (custom verb)

Batch-creates multiple cards, each with its checklists, in bounded parallel —
~10× faster than one-at-a-time on large plans. Cards route through the audited
`task.create` path; checklists are created two-phase (all checklists, then all
items) with a concurrency cap of 8 to respect Trello's 300 req/10s limit. One
card failing does not abort the batch. Autonomous-gateable via
`autonomous.allow`. Headless entry: `@llodev/pm-tasks-trello/adapter` →
`trelloBatchCreateWithChecklists`. This release's speedup is parallelism;
`idChecklistSource` template cloning (exposed by the Trello MCP) is a possible
future optimization for repeated checklist templates.
```

- [ ] **Step 5: Validate schema + contract-check**

Run: `make contract-check`
Expected: PASS — the namespace check (`trello.` prefix == manifest `tool`) and the SKILL.md grep both succeed.

Run: `pnpm validate` (or at minimum `node scripts/checks/validate-schemas.mjs`)
Expected: config.json still validates; no frontmatter/link regressions from the SKILL.md edit.

- [ ] **Step 6: Commit**

```bash
git add skills/pm-tasks-trello/manifest.json skills/pm-tasks-trello/schemas/config.json skills/pm-tasks-trello/references/operations.md skills/pm-tasks-trello/SKILL.md
git commit -m "feat(trello): declare trello.task.batch-create-with-checklists verb (F13)"
```

---

### Task 5: Parallelize the agent-driven path in `publish.md`

**Files:**

- Modify: `skills/pm-tasks-trello/references/publish.md`

**Interfaces:** none (agent instruction). This delivers the "instruction" half of the chosen scope — the common MCP-publish path where the agent issues the calls.

- [ ] **Step 1: Rewrite Step 2 ("Create checklists") to batch in parallel**

Replace the existing `**Step 2 — Create checklists**` block (the sequential per-item guidance) with this concrete text:

```markdown
**Step 2 — Create checklists (parallel batches)**

Create checklists and their items in bounded-parallel batches (not one at a
time) — ~10× faster on large plans:

1. **Phase A — checklists:** issue all `trello_create_checklist` calls for the
   card together, up to ~8 in flight — `{ cardId, name }` for each of Pre-flight,
   one per implementation block, Verification. Capture each returned `checklistId`.
2. **Phase B — items:** once all `checklistId`s are known, issue every
   `trello_create_check_item` call across all checklists together, up to ~8 in
   flight — `{ checklistId, name: "plain text, no markdown" }`.

Preserve order: Pre-flight → implementation blocks in plan order → Verification
last; items keep their plan order within each checklist.

**Rate limit:** Trello allows 300 req/10s per key. With ~8 in flight per phase,
a card with 8 checklists × 5 items (~50 calls) stays well within limits.

**Headless / autonomous consumers:** call the typed
`trello.task.batch-create-with-checklists` verb
(`@llodev/pm-tasks-trello/adapter` → `trelloBatchCreateWithChecklists`) instead
of issuing these calls by hand — it applies the same two-phase parallel batching.
```

- [ ] **Step 2: Verify docs still lint**

Run: `node scripts/checks/validate-links.mjs` (and `validate-frontmatter.mjs` if the file has frontmatter)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add skills/pm-tasks-trello/references/publish.md
git commit -m "docs(trello): parallelize checklist creation in publish sequence (F13)"
```

---

### Task 6: Build + regenerate release artifacts

**Files:**

- Modify: `scripts/snapshots/tarball-snapshot.json`, `.size-limit.json` (only if over budget)

**Interfaces:** none. Brings the release guardrails in sync with the new `dist` files (`concurrency.js`, `batch.js`, `batch-create.js`).

- [ ] **Step 1: Build the package**

Run: `pnpm --filter @llodev/pm-tasks-trello build` (or `make build`)
Expected: emits `dist/concurrency.js`, `dist/batch.js`, `dist/batch-create.js` (+ `.d.ts`).

- [ ] **Step 2: Run the tarball snapshot test to see the drift**

Run: `node --test scripts/checks/tarball-snapshot.test.mjs`
Expected: FAIL — `pm-tasks-trello` tarball now contains the new `dist` files not in the golden.

- [ ] **Step 3: Regenerate the golden**

Update the `pm-tasks-trello` array in `scripts/snapshots/tarball-snapshot.json` to include the new files (insert the `package/dist/…` entries in the same sorted position the test expects). Re-run the test:

Run: `node --test scripts/checks/tarball-snapshot.test.mjs`
Expected: PASS.

- [ ] **Step 4: Check the size budget**

Run: `make size` (or `pnpm run size`)
Expected: PASS. If the trello entry now exceeds `10 kB`, bump the `limit` in `.size-limit.json` to the next reasonable value and note it in the changeset. (The three new files are tiny; a bump is unlikely but verify.)

- [ ] **Step 5: Commit**

```bash
git add scripts/snapshots/tarball-snapshot.json .size-limit.json
git commit -m "chore(release): sync tarball snapshot + size budget for F13 (trello)"
```

---

### Task 7: Changeset, skill-judge baseline, pre-release rehearsal

**Files:**

- Create: `.changeset/<generated-name>.md`
- Modify: `scripts/snapshots/skill-judge-baseline.json`

**Interfaces:** none. Prepares the release and clears the pre-release gates.

- [ ] **Step 1: Create the changeset**

Run: `make changeset` (or `pnpm changeset`) and select `@llodev/pm-tasks-trello` → **minor**. Summary:

```
feat(trello): F13 batch card+checklist creation

Adds the custom namespaced verb `trello.task.batch-create-with-checklists`:
create many cards each with their checklists in bounded parallel (~10× faster
on large plans). Cards route through the audited canonical task.create path;
checklists are created two-phase (cap 8) to respect Trello's rate limit. The
agent-driven publish sequence (references/publish.md) is parallelized to match.
No pm-tasks-core change. If the skill-judge delta is within the noise band,
note the baseline re-affirmation here.
```

- [ ] **Step 2: Ratchet the skill-judge baseline (SKILL.md changed)**

Run the trello skill-judge scoring (`make skill-judge`) and update the `pm-tasks-trello` entry in `scripts/snapshots/skill-judge-baseline.json`: bump `version` `1.9.0` → `1.10.0` and update the score if it improved (Δ ≥ +3). If the score is within the noise band `[-2, +2]`, re-affirm the baseline and note that decision in the changeset (per repo `CLAUDE.md` release-gate rule). The `pre-release-check.sh` skill-judge gate blocks otherwise.

- [ ] **Step 3: Full pre-release rehearsal**

Run: `make preflight`
Expected: PASS — this runs build + typecheck + `validate` + `contract:check` + `pre-release-check.sh` (skill-judge gate, rubric drift gate, doctor gate) + `changeset status`. Fix anything it flags. (The rubric drift gate is silently skipped when the skill-judge SKILL.md is not installed locally, per `CLAUDE.md`.)

- [ ] **Step 4: Commit**

```bash
git add .changeset scripts/snapshots/skill-judge-baseline.json
git commit -m "chore(release): changeset + skill-judge baseline for trello v1.10.0 (F13)"
```

---

## Verification

**Unit (fast loop):**

- `pnpm --filter @llodev/pm-tasks-trello test` — concurrency, `createChecklists` (order + error classification), orchestrator (happy path + partial-failure). All pass.
- `pnpm --filter @llodev/pm-tasks-trello typecheck` — `TrelloTransport` / `TrelloAdapter` widened types compile; no `any` leaks.

**Repo gates:**

- `make contract-check` — verb namespaced correctly + present in SKILL.md.
- `make validate` — schema (config `allow` enum), tarball snapshot, size-limit, lint, coverage, links.
- `make preflight` — full release rehearsal green (incl. skill-judge + doctor gates).

**End-to-end dogfood (the real promotion gate — do this before opening the PR):**
Drive the actual capability, not just tests.

1. Build, then from a scratch script `import { createAdapter } from "@llodev/pm-tasks-trello/adapter"`, point `configPath` at a real `.trello.json`, and pass an `mcp` dispatcher wired to the live `mcp__trello__*` tools.
2. Call `trelloBatchCreateWithChecklists` with 2–3 cards, each carrying 2 checklists × ~3 items, targeting a real scratch board/list.
3. Confirm on the board: all cards created, every checklist + item present and in order, and the `BatchCreateResult` reports `ok: true`, correct `created`/`failed`, and resolved ids. Confirm the audit log has one `task.create` entry per card.
4. **MCP param conformance check** (per prior lesson): verify the live `trello_create_checklist` / `trello_create_check_item` accept exactly `{ cardId, name }` / `{ checklistId, name }` — a wrong/extra key fails hard under `additionalProperties:false`. **`listId`→`idList`:** the live `create_card` requires `idList`, but the existing typed `taskCreate` (`src/transport-trello.ts`) sends `listId`. The orchestrator creates cards via `runtime.taskCreate`, so if the live MCP rejects `listId` the whole batch fails at card creation. If dogfood surfaces this, apply the one-line fix in `taskCreate` (`args = { idList: req.listOrSectionId, name, desc }`) and update `tests/transport-trello.test.ts` expectations — a small pre-existing-bug fix folded into F13.
5. Agent-path spot check: run a normal multi-card Trello publish and confirm the parallelized `publish.md` Step 2 produces checklists correctly and visibly faster.

**Done when:** all unit tests + `make preflight` are green, the live dogfood creates cards+checklists correctly with `ok:true`, and the branch `pmt-trello-v1.10.0` carries exactly one changeset (trello minor).

## What comes after (out of scope)

- Fan-out of the same custom verb to asana/jira/linear/notion — demand-driven per roadmap §4; do **not** bundle here.
- Native `idChecklistSource` template cloning — the Trello MCP **does** expose `idChecklistSource` on `trello_create_checklist` (clones items from an existing checklist; verified live 2026-08-04). Not used in this release because F13's cards carry distinct checklists; revisit as an optimization for the same-template-across-many-cards case.
- Roadmap upkeep: once shipped, remove F13 from `docs/roadmap.md` §6 (per the top-of-doc "remove when shipped" rule) in the release PR.
