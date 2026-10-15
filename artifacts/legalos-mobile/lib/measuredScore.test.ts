import { describe, it, expect } from 'vitest';
import { computeMeasuredTotals, measuredScoreLabel, toScale500, scale500Suffix, historyScore500, measuredMaxFromProvenance } from './measuredScore';

// Parity with the web app's measuredScore.test.ts — the two ports must
// render identical 500-scale totals for identical inputs.

describe('toScale500', () => {
  it('rescales full-coverage totals against the internal 200', () => {
    expect(toScale500(148, 200)).toBe(370);
    expect(toScale500(0, 200)).toBe(0);
  });

  it('guards a zero max rather than dividing by it', () => {
    expect(toScale500(10, 0)).toBe(0);
  });
});

describe('measuredScoreLabel (500 scale)', () => {
  it('shows the full 500 when every category is measured', () => {
    const totals = computeMeasuredTotals([
      { label: 'Performance', score: 18, max: 20, provenance: 'api' },
      { label: 'Social Media', score: 15, max: 20, provenance: 'self_reported' },
      { label: 'SEO & Authority', score: 45, max: 60, provenance: 'api' },
      { label: 'Thought Leadership', score: 30, max: 45, provenance: 'ai_classified' },
      { label: 'Reputation', score: 40, max: 55, provenance: 'api' },
    ]);
    expect(measuredScoreLabel(148, totals)).toBe('370 / 500');
  });

  it('rescales partial totals against the measured max, keeping the measured qualifier', () => {
    const totals = computeMeasuredTotals([
      { label: 'Performance', score: 14, max: 20, provenance: 'api' },
      { label: 'Social Media', score: 9, max: 20, provenance: 'self_reported' },
      { label: 'SEO & Authority', score: 0, max: 60, provenance: 'missing' },
      { label: 'Thought Leadership', score: 20, max: 45, provenance: 'ai_classified' },
      { label: 'Reputation', score: 37, max: 55, provenance: 'api' },
    ]);
    expect(scale500Suffix(totals)).toBe('/ 500 measured');
    expect(measuredScoreLabel(80, totals)).toBe('286 / 500 measured');
  });
});

// Parity with the web app's historyScore500 tests — both ports must render
// identical 500-scale history points and deltas for identical inputs.
describe('historyScore500 — frozen-snapshot scaling', () => {
  const FULL_PROVENANCE = {
    performance: 'measured',
    social: 'measured',
    seoAuthority: 'measured',
    thoughtLeadership: 'measured',
    reputation: 'measured',
  };

  it('scales a fully measured snapshot against the full 200', () => {
    expect(historyScore500(120, FULL_PROVENANCE)).toBe(300);
  });

  it('scales a partial snapshot against what IT measured, not a flat 200', () => {
    // SEO & Authority (max 60) missing at that snapshot → measured max 140.
    expect(historyScore500(70, { ...FULL_PROVENANCE, seoAuthority: 'missing' })).toBe(250);
    expect(measuredMaxFromProvenance({ ...FULL_PROVENANCE, seoAuthority: 'missing' })).toBe(140);
  });

  it('treats snapshots without frozen provenance as fully measured', () => {
    expect(historyScore500(120, null)).toBe(300);
  });

  it('endpoint deltas match what the chart shows (rounding parity)', () => {
    // raw 77 → 193, raw 78 → 195: displayed delta is +2; scaling the raw
    // +1 difference (toScale500(1, 200) = 3) would contradict the chart.
    expect(toScale500(1, 200)).toBe(3);
    expect(historyScore500(78, null) - historyScore500(77, null)).toBe(2);
  });

  it('keeps the sparkline, audit log, and summary delta consistent across a denominator change', () => {
    // Regression for the mixed-provenance case: snapshot A could NOT
    // measure SEO & Authority (70/140 measured → 250), snapshot B measured
    // everything (80/200 → 200). Raw scores RISE (70 → 80) while the
    // displayed 500-scale values FALL — the sparkline must plot the scaled
    // values or it shows a climb while the log and delta show a decline.
    const a = { score: 70, provenance: { ...FULL_PROVENANCE, seoAuthority: 'missing' } };
    const b = { score: 80, provenance: FULL_PROVENANCE };

    const sparklineValues = [a, b].map(d => historyScore500(d.score, d.provenance));
    expect(sparklineValues).toEqual([250, 200]);
    expect(b.score).toBeGreaterThan(a.score); // raw rises…
    expect(sparklineValues[1]).toBeLessThan(sparklineValues[0]); // …display falls

    // The per-row diff is the difference of the scaled endpoints, rendered
    // as-is — and it equals the summary endpoint delta.
    const rowDiff = historyScore500(b.score, b.provenance) - historyScore500(a.score, a.provenance);
    expect(rowDiff).toBe(-50);
    expect(rowDiff).toBe(sparklineValues[1] - sparklineValues[0]);
  });
});
