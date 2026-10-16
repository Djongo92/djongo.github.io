// Mobile side of the trend-evidence parity contract: the mobile trend
// formatters (trendMetrics.ts) must produce exactly the canonical strings
// pinned in trendEvidenceStrings.ts. The web side has a mirror test that
// reads trendEvidenceStrings.ts over the filesystem and asserts the web
// builders match the same constants — so the two ports can never drift.
import { describe, it, expect } from 'vitest';
import { CATEGORY_TREND_METRIC, historyEvidenceLine, type TrendCategoryKey } from './trendMetrics';
import {
  TREND_EVIDENCE_CASES,
  TREND_NULL_GATES,
  FULL_EVIDENCE_RAW,
  FULL_EVIDENCE_PROVENANCE,
  FULL_EVIDENCE_LINE,
  PROVENANCE_GATE,
} from './trendEvidenceStrings';

describe('mobile trend evidence matches the canonical strings', () => {
  it('every category formatter emits its pinned string', () => {
    for (const key of Object.keys(TREND_EVIDENCE_CASES) as TrendCategoryKey[]) {
      const { raw, expected } = TREND_EVIDENCE_CASES[key];
      expect(CATEGORY_TREND_METRIC[key](raw)).toBe(expected);
    }
  });

  it('every null/provenance gate returns null — never a fabricated value', () => {
    const gates = TREND_NULL_GATES;
    expect(CATEGORY_TREND_METRIC.performance(gates.performancePartial.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.performance(gates.performanceNull.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.social(gates.socialNoFollowers.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.thoughtLeadership(gates.thoughtLeadershipNoPosts.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.reputation(gates.reputationNotListed.raw)).toBeNull();
    expect(CATEGORY_TREND_METRIC.reputation(gates.reputationNull.raw)).toBeNull();
  });

  it('joins the full evidence line identically', () => {
    expect(historyEvidenceLine(FULL_EVIDENCE_RAW, FULL_EVIDENCE_PROVENANCE)).toBe(FULL_EVIDENCE_LINE);
  });

  it('honors the provenance gate — a "missing" category drops out, null provenance yields nothing', () => {
    expect(historyEvidenceLine(PROVENANCE_GATE.raw, PROVENANCE_GATE.provenance)).toBe(PROVENANCE_GATE.expected);
    expect(historyEvidenceLine(PROVENANCE_GATE.raw, null)).toBe(PROVENANCE_GATE.nullProvenanceExpected);
  });
});
