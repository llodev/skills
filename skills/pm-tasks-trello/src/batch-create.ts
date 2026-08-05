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
 * Cards go through the audited canonical `runtime.taskCreate` (so the
 * autonomous audit trail is preserved); checklists go through the Trello
 * `createChecklists` extension. One card failing does not abort the batch —
 * every per-card step is caught so a thrown/rejected call degrades to a
 * failed `BatchCardResult` instead of failing the whole batch. NOTE: this is
 * audit-only — there is no automatic dedupe on retry (the runtime layer does
 * not read the `[ct:]` marker back), so re-running a batch re-creates cards
 * that already succeeded.
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
      let cardRef: { id: string; url?: string } | undefined;
      try {
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
        cardRef = { id: createRes.data.id, url: createRes.data.url };

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
      } catch (e) {
        // A per-card op threw/rejected instead of returning an {ok:false}
        // envelope (e.g. the core audit-append can reject on a filesystem
        // error). Degrade to a failed result so the batch keeps going.
        const message = e instanceof Error ? e.message : String(e);
        return {
          ok: false,
          ...(cardRef !== undefined ? { card: cardRef } : {}),
          error: { code: "MCP_ERROR", message },
        };
      }
    },
  );

  const failed = results.filter((r) => !r.ok).length;
  return { ok: failed === 0, created: results.length - failed, failed, results };
}
