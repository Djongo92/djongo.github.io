// A viewer shouldn't read "ahead of 61% of peers" as precise when the peer
// group behind it is tiny — a percentile computed from 4 firms swings
// wildly the moment a 5th joins, in a way one computed from 40 firms
// doesn't. Mirrors MIN_PEER_SAMPLE (supabase/functions/_shared/
// percentileFormula.ts's own low-confidence threshold for a single metric's
// peer comparison) rather than inventing a second, different number for the
// same idea applied at the list level.
export const LOW_SAMPLE_THRESHOLD = 5;

export function isLowConfidenceSample(sampleSize: number): boolean {
  return sampleSize < LOW_SAMPLE_THRESHOLD;
}
