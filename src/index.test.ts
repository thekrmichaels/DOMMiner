import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { main } from "./index.ts";

test("analyzes a directory and generates a report", async () => {
  await main("./fixtures");

  assert.ok(existsSync("./dom-miner-report.json"));
});
