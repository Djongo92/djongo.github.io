import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyFirm } from "../src/lib/firmCheckStatus.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const allowlist = JSON.parse(readFileSync(resolve(here, "../src/data/unscoredTrackedFirms.json"), "utf8"));
const UNSCORED = Object.keys(allowlist).filter((k) => k !== "_comment");

const RANKED = [{ name: "BDK Advokati", rank: 1, score: 387 }];
const TRACKED = [
  { name: "BDK Advokati" },
  { name: "Gecić Law" },
  ...UNSCORED.map((name) => ({ name })),
];

test("a leaderboard firm classifies as ranked", () => {
  const r = classifyFirm("BDK Advokati", RANKED, TRACKED, UNSCORED);
  assert.equal(r.kind, "ranked");
});

test("a published (scored) directory firm classifies as scored", () => {
  const r = classifyFirm("Gecic Law", RANKED, TRACKED, UNSCORED);
  assert.deepEqual(r, { kind: "scored", name: "Gecić Law" });
});

test("every allowlisted (tracked-but-unscored) firm is NEVER presented as scored/benchmarked", () => {
  assert.ok(UNSCORED.length > 0, "allowlist should have at least one entry while a tracked firm lacks an audit");
  for (const name of UNSCORED) {
    const r = classifyFirm(name, RANKED, TRACKED, UNSCORED);
    assert.deepEqual(r, { kind: "unscored", name }, `'${name}' must classify as unscored`);
  }
});

test("an unknown firm classifies as null (not found)", () => {
  assert.equal(classifyFirm("Totally Unknown Firm", RANKED, TRACKED, UNSCORED), null);
});
