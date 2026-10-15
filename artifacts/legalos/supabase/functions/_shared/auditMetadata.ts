// Pure audit-level data-integrity metadata — no Deno globals, no network.
// Distinct from percentileFormula.ts's per-metric PeerStats: this rolls
// several metrics' worth of peer comparisons up into ONE audit-level
// sample size and confidence score, plus the methodology version and data
// window every stored audit now carries per CLAUDE.md §3.
import type { PeerStats } from "./percentileFormula.ts";

/**
 * Bump this whenever the scoring FORMULA changes (not when a data source is
 * merely added/removed). v1 = peer-maximum normalization; v2 = 90th-
 * percentile normalization with the minimum-sample rule. Historical rows
 * keep whatever version actually produced them — never rewritten — so a
 * trend chart can tell "this dip is a real score change" apart from "this
 * dip is two different methodologies side by side."
 */
export const METHODOLOGY_VERSION = 2;

export interface AuditConfidence {
  /** The smallest peer-comparison sample size behind any metric in this
   *  audit — the weakest link, since one thin comparison undermines the
   *  whole score's precision even if every other metric had a deep sample. */
  sampleSize: number | null;
  /** Fraction (0-1) of this audit's peer-normalized metrics that met the
   *  minimum sample rule. null when the audit has no peer-normalized
   *  metrics at all (e.g. every category came back "missing"). */
  confidenceScore: number | null;
}

/**
 * Rolls a set of per-metric PeerStats (some of which may be null — a
 * metric that scored "missing" has no comparison at all) up into one
 * audit-level sample size and confidence score.
 */
export function computeAuditConfidence(peerStatsList: (PeerStats | null | undefined)[]): AuditConfidence {
  const present = peerStatsList.filter((s): s is PeerStats => !!s);
  if (present.length === 0) return { sampleSize: null, confidenceScore: null };

  const sampleSize = Math.min(...present.map((s) => s.sampleSize));
  const confident = present.filter((s) => !s.lowConfidence).length;
  const confidenceScore = Math.round((confident / present.length) * 100) / 100;

  return { sampleSize, confidenceScore };
}

export interface DataWindow {
  start: string;
  end: string;
}

/** The audit's overall data window: `windowDays` back from the moment it ran. */
export function computeDataWindow(now: Date, windowDays: number): DataWindow {
  const start = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: now.toISOString() };
}
