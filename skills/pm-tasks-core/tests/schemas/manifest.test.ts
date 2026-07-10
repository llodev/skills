import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const HERE = import.meta.dirname;

async function buildValidate() {
  const schema = JSON.parse(
    await readFile(path.join(HERE, "..", "..", "schemas", "adapter-manifest.schema.json"), "utf8"),
  );
  const ajv = new Ajv2020({ strict: false });
  return ajv.compile(schema);
}

test("manifest with 6 canonical verbs is valid", async () => {
  const validate = await buildValidate();
  const result = validate({
    tool: "trello",
    verbs: [
      "task.create",
      "task.close",
      "task.due-date.set",
      "task.assignee.add",
      "task.comment.add",
      "checklist.check",
    ],
  });
  expect(result).toBe(true);
});

test("manifest with 4 canonical + 1 custom namespaced verb is valid", async () => {
  const validate = await buildValidate();
  const result = validate({
    tool: "trello",
    verbs: [
      "task.create",
      "task.close",
      "task.due-date.set",
      "task.assignee.add",
      "trello.card.cover-image.set",
    ],
  });
  expect(result).toBe(true);
});

test("manifest without tool field is invalid", async () => {
  const validate = await buildValidate();
  const result = validate({
    verbs: ["task.create"],
  });
  expect(result).toBe(false);
});

test("manifest with uppercase verb (Task.Create) is invalid", async () => {
  const validate = await buildValidate();
  const result = validate({
    tool: "trello",
    verbs: ["Task.Create"],
  });
  expect(result).toBe(false);
});

test("manifest with empty verbs array is invalid (minItems: 1)", async () => {
  const validate = await buildValidate();
  const result = validate({
    tool: "trello",
    verbs: [],
  });
  expect(result).toBe(false);
});

test("manifest with uppercase tool field (Trello) is invalid", async () => {
  const validate = await buildValidate();
  const result = validate({
    tool: "Trello",
    verbs: ["task.create"],
  });
  expect(result).toBe(false);
});
