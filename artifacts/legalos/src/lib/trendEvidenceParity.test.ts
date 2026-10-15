// Web side of the trend-evidence parity contract. The canonical evidence
// strings live in the mobile artifact (lib/trendEvidenceStrings.ts) so there
// is ONE source of truth; the web must never import from mobile across
// artifacts, so this test reads that file over the filesystem (via Vite's
// transform of the dependency-free module) and asserts the web builders
// (visibilityInputFormatters.ts) produce byte-identical strings.
//
// This is the guard against the exact drift that shipped once: the web full
// formatter said "LinkedIn followers" while the trend line said "followers",
// and performance full said "Desktop X / Mobile Y (avg Z)" vs the trend
// "Z PageSpeed avg". A mirror test on the mobile side pins the mobile
// builders to the same constants.
import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  CATEGORY_TREND_METRIC,
  historyEvidenceLine,
} from "./visibilityInputFormatters";
import type { CategoryKey } from "./visibilityCategories";

// vitest runs with cwd = artifacts/legalos; the mobile module is a sibling
// artifact. Vite can transform the dependency-free TS file for a dynamic
// import, giving us the exported constants without a cross-artifact TS import.
const MOBILE_STRINGS = resolve(
  process.cwd(),
  "../legalos-mobile/lib/trendEvidenceStrings.ts",
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fixtures: any;

beforeAll(async () => {
  fixtures = await import(/* @vite-ignore */ pathToFileURL(MOBILE_STRINGS).href);
});

describe("web trend evidence matches the canonical mobile strings", () => {
  it("every category formatter emits its pinned string", () => {
    for (const key of Object.keys(fixtures.TREND_EVIDENCE_CASES) as CategoryKey[]) {
      const { raw, expected } = fixtures.TREND_EVIDENCE_CASES[key];
      expect(CATEGORY_TREND_METRIC[key](raw)).toBe(expected);
    }
  });

  it("every null/provenance gate returns null — never a fabricated value", () => {
    const gates = fixtures.TREND_NULL_GATES;
    expect(CATEGORY_TREND_METRIC.performance(gates.performancePartial.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.performance(gates.performanceNull.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.social(gates.socialNoFollowers.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.thoughtLeadership(gates.thoughtLeadershipNoPosts.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.reputation(gates.reputationNotListed.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.reputation(gates.reputationNull.raw)).toBeNull();
  });

  it("joins the full evidence line identically", () => {
    expect(
      historyEvidenceLine(fixtures.FULL_EVIDENCE_RAW, fixtures.FULL_EVIDENCE_PROVENANCE),
    ).toBe(fixtures.FULL_EVIDENCE_LINE);
  });

  it("honors the provenance gate — a \"missing\" category drops out, null provenance yields nothing", () => {
    const g = fixtures.PROVENANCE_GATE;
    expect(historyEvidenceLine(g.raw, g.provenance)).toBe(g.expected);
    expect(historyEvidenceLine(g.raw, null)).toBe(g.nullProvenanceExpected);
  });
});
