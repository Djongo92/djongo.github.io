import { test } from "node:test";
import assert from "node:assert/strict";
import { reconcileCohort } from "./check-firm-cohort.mjs";

const snap = (names) => ({ firms: names.map((name) => ({ name, domain: `${name}.rs` })) });

test("reconciled cohort produces no errors", () => {
  const errors = reconcileCohort(["A", "B", "C"], snap(["A", "B"]), { _comment: "x", C: "no site yet" });
  assert.deepEqual(errors, []);
});

test("old-format snapshot without firms array fails loudly", () => {
  const errors = reconcileCohort(["A"], { scores: [1] }, {});
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no firms array/);
});

test("published-but-untracked firm is an error", () => {
  const errors = reconcileCohort(["A"], snap(["A", "Ghost Firm"]), {});
  assert.equal(errors.length, 1);
  assert.match(errors[0], /untracked firm: 'Ghost Firm'/);
});

test("tracked-but-unpublished firm needs an allowlist entry", () => {
  const errors = reconcileCohort(["A", "B"], snap(["A"]), {});
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no published audit: 'B'/);
});

test("allowlist entry for a non-tracked firm is stale", () => {
  const errors = reconcileCohort(["A"], snap(["A"]), { Gone: "reason" });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /'Gone' is not a tracked firm/);
});

test("allowlist entry for a now-published firm is stale", () => {
  const errors = reconcileCohort(["A", "B"], snap(["A", "B"]), { B: "reason" });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /'B' now HAS a published audit/);
});

test("_comment key is ignored", () => {
  const errors = reconcileCohort(["A"], snap(["A"]), { _comment: "docs" });
  assert.deepEqual(errors, []);
});
