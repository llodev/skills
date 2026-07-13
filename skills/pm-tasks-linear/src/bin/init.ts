#!/usr/bin/env node
// pm-tasks-linear init — thin CLI shim. Library surface lives in ../init-flow.ts.
import { runInit } from "../init-flow.js";

async function run(): Promise<void> {
  await runInit();
}

run().catch((e) => {
  console.error("pm-tasks-linear init:", (e as Error).message);
  process.exit(1);
});
