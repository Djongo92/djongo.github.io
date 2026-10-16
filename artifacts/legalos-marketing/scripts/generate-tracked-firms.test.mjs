import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFirms } from "./generate-tracked-firms.mjs";

const seed = `
INSERT INTO public.market_directory_data (market, firm_name, firm_type, chambers, legal500, iflr1000, last_verified_at)
VALUES
  ('serbia', 'Alpha & Partners', 'L', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Beta Advokati', 'L', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('croatia', 'Zagreb Legal', 'L', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz),
  ('serbia', 'Gamma O''Brien', 'L', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-07-19'::timestamptz)
ON CONFLICT (market, firm_name) DO NOTHING;
`;

test("filters rows to the requested market", () => {
  assert.deepEqual(computeFirms([seed]), ["Alpha & Partners", "Beta Advokati", "Gamma O'Brien"]);
});

test("applies renames from UPDATE migrations", () => {
  const rename = `
UPDATE public.market_directory_data
SET firm_name = 'Beta & Delta Advokati'
WHERE market = 'serbia' AND firm_name = 'Beta Advokati';
`;
  assert.deepEqual(computeFirms([seed, rename]), ["Alpha & Partners", "Beta & Delta Advokati", "Gamma O'Brien"]);
});

test("applies removals from DELETE migrations (single and IN list)", () => {
  const del = `
DELETE FROM public.market_directory_data WHERE market = 'serbia' AND firm_name = 'Alpha & Partners';
DELETE FROM public.market_directory_data WHERE market = 'serbia' AND firm_name IN ('Gamma O''Brien', 'Not Present');
`;
  assert.deepEqual(computeFirms([seed, del]), ["Beta Advokati"]);
});

test("ignores UPDATE/DELETE scoped to other markets", () => {
  const other = `
UPDATE public.market_directory_data SET firm_name = 'Alpha & Partners' WHERE market = 'croatia' AND firm_name = 'Zagreb Legal';
DELETE FROM public.market_directory_data WHERE market = 'croatia' AND firm_name = 'Zagreb Legal';
`;
  assert.deepEqual(computeFirms([seed, other]), ["Alpha & Partners", "Beta Advokati", "Gamma O'Brien"]);
});

test("later inserts for other markets never leak into the serbia list", () => {
  const laterInsert = `
INSERT INTO public.market_directory_data (market, firm_name, firm_type, chambers, legal500, iflr1000, last_verified_at)
VALUES ('montenegro', 'Podgorica Law', 'L', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '2026-08-01'::timestamptz);
`;
  assert.deepEqual(computeFirms([seed, laterInsert]), ["Alpha & Partners", "Beta Advokati", "Gamma O'Brien"]);
});

test("re-inserting an existing firm does not duplicate it", () => {
  assert.deepEqual(computeFirms([seed, seed]), ["Alpha & Partners", "Beta Advokati", "Gamma O'Brien"]);
});

test("computeFirmsWithTypes replays firm_type per row", async () => {
  const { computeFirmsWithTypes } = await import("./generate-tracked-firms.mjs");
  const { names, types } = computeFirmsWithTypes([seed]);
  assert.deepEqual(names, ["Alpha & Partners", "Beta Advokati", "Gamma O'Brien"]);
  assert.equal(types.get("Alpha & Partners"), "L");
});

test("census-style rows with NULL domains parse position-preserving (spaced and compact)", async () => {
  const { computeFirmsWithTypes } = await import("./generate-tracked-firms.mjs");
  const census = `
INSERT INTO public.market_directory_data (market, firm_name, firm_domain, firm_type)
VALUES
  ('serbia', 'No Site Law', NULL, 'L'),
  ('serbia', 'Compact Null & Co',NULL,'R');
`;
  const { names, types } = computeFirmsWithTypes([seed, census]);
  assert.ok(names.includes("No Site Law"), "spaced NULL row parsed");
  assert.ok(names.includes("Compact Null & Co"), "compact ,NULL row parsed");
  assert.equal(types.get("No Site Law"), "L");
  assert.equal(types.get("Compact Null & Co"), "R");
});
