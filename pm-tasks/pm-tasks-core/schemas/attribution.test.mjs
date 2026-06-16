import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import Ajv2020 from "ajv/dist/2020.js"

const HERE = import.meta.dirname

test("config without attribution is valid (backwards-compat)", async () => {
  const attributionSchema = JSON.parse(
    await readFile(path.join(HERE, "attribution.schema.json"), "utf8"),
  )
  const ajv = new Ajv2020({ strict: false })
  ajv.addSchema(attributionSchema)
  // Simulate adapter config where attribution is an optional $ref property
  const wrapperSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      attribution: { $ref: "https://llodev.com/pm-tasks/attribution.schema.json" },
    },
  }
  const validate = ajv.compile(wrapperSchema)
  // Adapter config omitting attribution entirely — must be valid
  const result = validate({ version: "1" })
  assert.equal(result, true)
})

test("attribution { enabled: true } is valid", async () => {
  const schema = JSON.parse(
    await readFile(path.join(HERE, "attribution.schema.json"), "utf8"),
  )
  const ajv = new Ajv2020({ strict: false })
  const validate = ajv.compile(schema)
  const result = validate({ enabled: true })
  assert.equal(result, true)
})

test("attribution with all fields is valid", async () => {
  const schema = JSON.parse(
    await readFile(path.join(HERE, "attribution.schema.json"), "utf8"),
  )
  const ajv = new Ajv2020({ strict: false })
  const validate = ajv.compile(schema)
  const result = validate({ enabled: true, includeAgentName: true, autonomousOnly: false })
  assert.equal(result, true)
})

test("attribution { enabled: 'yes' } is invalid (wrong type)", async () => {
  const schema = JSON.parse(
    await readFile(path.join(HERE, "attribution.schema.json"), "utf8"),
  )
  const ajv = new Ajv2020({ strict: false })
  const validate = ajv.compile(schema)
  const result = validate({ enabled: "yes" })
  assert.equal(result, false)
})
