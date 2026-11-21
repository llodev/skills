import { describe, it, expect } from "vitest";
import { readClickUpToken, stripEnvQuotes } from "../src/env.js";

describe("stripEnvQuotes", () => {
  it.each([
    ['"abc"', "abc"],
    ["'abc'", "abc"],
    ['  "abc"  ', "abc"],
    ["  abc  ", "abc"],
    ["abc", "abc"],
    ['""abc""', '"abc"'],
    ["\"abc'", "\"abc'"],
    ['"abc', '"abc'],
    ['"', '"'],
    ['""', ""],
  ])("%j → %j", (input, expected) => {
    expect(stripEnvQuotes(input)).toBe(expected);
  });
});

describe("readClickUpToken", () => {
  it("returns the trimmed, unquoted CLICKUP_API_TOKEN", () => {
    expect(readClickUpToken({ CLICKUP_API_TOKEN: "tok-123" })).toBe("tok-123");
    expect(readClickUpToken({ CLICKUP_API_TOKEN: '  "tok-123"  ' })).toBe("tok-123");
    expect(readClickUpToken({ CLICKUP_API_TOKEN: "' tok-123 '" })).toBe("tok-123");
  });

  it("is undefined when the variable is unset, empty, blank or only quotes", () => {
    expect(readClickUpToken({})).toBeUndefined();
    expect(readClickUpToken({ CLICKUP_API_TOKEN: "" })).toBeUndefined();
    expect(readClickUpToken({ CLICKUP_API_TOKEN: "   " })).toBeUndefined();
    expect(readClickUpToken({ CLICKUP_API_TOKEN: '""' })).toBeUndefined();
    expect(readClickUpToken({ CLICKUP_API_TOKEN: "' '" })).toBeUndefined();
  });

  it("ignores every other variable", () => {
    expect(readClickUpToken({ LINEAR_API_KEY: "x", CLICKUP_TOKEN: "y" })).toBeUndefined();
  });
});
