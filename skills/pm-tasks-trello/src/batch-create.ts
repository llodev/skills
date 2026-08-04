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
