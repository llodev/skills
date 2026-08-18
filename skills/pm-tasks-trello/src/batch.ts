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
  dueDate?: string; // full ISO 8601 date-time, maps to create_card `due` (date-only is rejected)
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
