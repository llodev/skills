#!/usr/bin/env node
// pm-tasks-linear init — thin CLI shim. Library surface lives in ../init-flow.ts.
import path from "node:path";
import { runInit } from "../init-flow.js";

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--doctor")) {
    const { runDoctor } = await import("../doctor-cli.js");
    await runDoctor({ tool: "linear", argv });
    return;
  }

  const outputIdx = argv.indexOf("--output");
  const outPath =
    outputIdx !== -1 && argv[outputIdx + 1] ? path.resolve(argv[outputIdx + 1]) : undefined;

  await runInit({ outPath });
}

run().catch((e) => {
  console.error("pm-tasks-linear init:", (e as Error).message);
  process.exit(1);
});
