import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { countChapters } from "./generate-guidebook-meta.mjs";

test("counts only chapter files — types.ts, tests, and non-TS files excluded", () => {
  assert.equal(
    countChapters(["alpha.ts", "beta.ts", "types.ts", "alpha.test.ts", "README.md", ".DS_Store"]),
    2,
  );
});

test("empty directory yields zero (generator refuses to write)", () => {
  assert.equal(countChapters([]), 0);
  assert.equal(countChapters(["types.ts"]), 0);
});

test("canonical registry resolves and is non-trivially sized", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = resolve(here, "../../legalos/src/data/chapters");
  const count = countChapters(readdirSync(dir));
  // Floor, not exact — growth must NOT break this test; emptiness must.
  assert.ok(count >= 15, `expected >= 15 chapters in the canonical registry, got ${count}`);
});
