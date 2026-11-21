import { describe, it, expect } from "vitest";
import { invalidRequest } from "../src/errors.js";

describe("invalidRequest", () => {
  it("carries extra details without letting them replace verb, reason or message", () => {
    const failure = invalidRequest("task.move", "status_rejected", "rejected", {
      listId: "1000400000000002",
      status: "in progress",
      role: "wip",
      reason: "overridden",
      verb: "overridden",
      message: "overridden",
    });
    expect(failure).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      details: {
        verb: "task.move",
        reason: "status_rejected",
        message: "rejected",
        listId: "1000400000000002",
        status: "in progress",
        role: "wip",
      },
    });
    expect(invalidRequest("task.create", "list_required", "required").details).toEqual({
      verb: "task.create",
      reason: "list_required",
      message: "required",
    });
  });
});
