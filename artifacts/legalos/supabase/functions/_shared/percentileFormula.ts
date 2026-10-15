// Pure peer-normalization math — no Deno globals, no network. Replaces the
// old "divide by the peer group's raw maximum" approach everywhere a metric
// is scored relative to peers (Social's followers/posts/engagement,
// Thought Leadership's posts/news, Reputation's Chambers/Legal 500/IFLR1000
// "quality" sub-score).
//
// Dividing by the observed maximum means one outlier firm compresses every
// other firm's score, a firm can improve in absolute terms and still lose
// points because a rival improved more, and small peer groups swing wildly
// on a single new data point. Benchmarking against the 90th percentile
// instead means anyone at or above it earns full marks for that metric —
// a single dominant firm can no longer distort the field, and "the max"
// (still stored, for auditability) stops being load-bearing.
export const MIN_PEER_SAMPLE = 5;

export interface PeerStats {
  /** This firm's own raw value for the metric. */
  value: number;
  /** Median value across the peer group (including this firm). */
  peerMedian: number;
  /** The 90th-percentile value — anyone at or above this earns full marks. */
  p90Threshold: number;
  /** The single highest value observed in the comparison set — stored for
   *  auditability only; it is NOT the denominator anymore. */
  highestObserved: number;
  /** How many firms (including this one) fed this comparison. */
  sampleSize: number;
  /** ISO timestamp of when this comparison was computed. */
  comparisonDate: string;
  /** True when sampleSize is below MIN_PEER_SAMPLE even after widening the
   *  comparison set — the number is real but shouldn't be read as precise. */
  lowConfidence: boolean;
  /** True when the comparison set had to widen beyond the firm's own peer
   *  group (e.g. from "regional" firms only to the whole market) to reach
   *  a usable sample size. */
  widened: boolean;
}

/**
 * Linear-interpolation percentile (the same method as Excel's
 * PERCENTILE.INC / numpy's default) — appropriate for the small (single- to
 * low-double-digit) peer group sizes this product actually sees.
 */
export function percentileOf(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const rank = (p / 100) * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedAsc[lower];
  const frac = rank - lower;
  return sortedAsc[lower] + (sortedAsc[upper] - sortedAsc[lower]) * frac;
}

/**
 * Builds the full six-value (plus confidence/widen flags) audit record for
 * one metric. `values` should include the firm's own value alongside every
 * peer's — sampleSize is simply values.length, which is exactly the number
 * the minimum-sample rule needs to see.
 */
export function computePeerStats(
  values: number[],
  ownValue: number,
  opts: { widened?: boolean; now?: Date } = {},
): PeerStats {
  const sorted = [...values].sort((a, b) => a - b);
  const sampleSize = sorted.length;
  const now = opts.now ?? new Date();
  return {
    value: ownValue,
    peerMedian: Math.round(percentileOf(sorted, 50) * 100) / 100,
    p90Threshold: Math.round(percentileOf(sorted, 90) * 100) / 100,
    highestObserved: sampleSize > 0 ? sorted[sampleSize - 1] : ownValue,
    sampleSize,
    comparisonDate: now.toISOString(),
    lowConfidence: sampleSize < MIN_PEER_SAMPLE,
    widened: opts.widened ?? false,
  };
}

/**
 * The share of full marks this metric earns: 1.0 at or above the 90th
 * percentile, scaled linearly below it, 0 when there's no usable threshold
 * (e.g. every observed value, including this firm's, is 0).
 */
export function p90Ratio(stats: Pick<PeerStats, "value" | "p90Threshold">): number {
  return stats.p90Threshold > 0 ? Math.min(1, stats.value / stats.p90Threshold) : 0;
}
