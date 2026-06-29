#!/usr/bin/env node
// pm-tasks-jira init — thin CLI shim. Library surface lives in ../init-flow.ts.
import path from "node:path";
import { runFlow } from "../init-flow.js";

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--doctor")) {
    const { runDoctor } = await import("../doctor-cli.js");
    await runDoctor({ tool: "jira", argv });
    return;
  }

  const outputIdx = process.argv.indexOf("--output");
  const outPath =
    outputIdx !== -1 && process.argv[outputIdx + 1]
      ? path.resolve(process.argv[outputIdx + 1])
      : undefined;

  await runFlow({ outPath });
}

run().catch((e) => {
  console.error("pm-tasks-jira init:", (e as Error).message);
  process.exit(1);
});
