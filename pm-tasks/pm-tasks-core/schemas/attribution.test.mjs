import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import Ajv2020 from "ajv/dist/2020.js"

const HERE = import.meta.dirname

test("config without attribution is valid (backwards-compat)", async () => {
  const schema = JSON.parse(
    await readFile(path.join(HERE, "attribution.schema.json"), "utf8"),
  )
  const ajv = new Ajv2020({ strict: false })
  const validate = ajv.compile(schema)
  const result = validate({})
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
