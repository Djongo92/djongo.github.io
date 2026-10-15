// §9 — Reports and exports: the one data shape every export format (PDF,
// PPTX, DOCX, "Excel"/CSV) reads from, so the four generators can never
// silently drift apart on what an executive report actually contains.
import type { CategoryKey } from "@/lib/visibilityCategories";

export interface ExecutiveReportHistoryPoint {
  recordedAt: string;
  totalScore: number;
  /** Rolled-up 0–1 confidence frozen for THIS snapshot (null on rows
   *  predating the field) — lets an export flag a past dip as possibly
   *  thin-peer-sample rather than a real regression. */
  confidenceScore: number | null;
  /** Smallest peer sample behind any metric in this snapshot. */
  sampleSize: number | null;
  /** Compact evidence line ("1,850 followers · ★ 4.6 GBP") from the frozen
   *  raw_metrics, gated on frozen provenance — a category that scored
   *  "missing" on that snapshot never contributes a fabricated value.
   *  Null when nothing was recorded (older rows). */
  rawMetric: string | null;
}

export interface ExecutiveReportData {
  firmName: string;
  domain: string;
  market: string;
  peerGroup: string;
  totalScore: number;
  percentile: number | null;
  peerCount: number;
  narrative: string | null;
  categories: Record<CategoryKey, { score: number; provenance: string }>;
  history: ExecutiveReportHistoryPoint[];
  generatedAt: Date;
}

/** The derived trend block every export format renders from history —
 *  delta line, thin-sample caveat, latest evidence. Computed ONCE here so
 *  the PDF / DOCX / PPTX can't drift on wording or thresholds. Returns null
 *  when there's no trend to show (fewer than two measurements). */
export interface ExecutiveReportTrend {
  /** Rounded to 0.1. */
  delta: number;
  /** "+3.2 points since 1 Jul 2026 (5 measurements)" */
  deltaLine: string;
  /** Points recorded on a thin peer sample (frozen confidence < 1). */
  thinCount: number;
  /** Caveat line, or null when no point was thin-sampled. */
  thinSampleNote: string | null;
  /** "Latest snapshot evidence: …", or null when nothing was recorded. */
  evidenceLine: string | null;
}

export function computeTrendSummary(history: ExecutiveReportHistoryPoint[]): ExecutiveReportTrend | null {
  if (history.length <= 1) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const delta = Math.round((last.totalScore - first.totalScore) * 10) / 10;
  const thinCount = history.filter((h) => h.confidenceScore != null && h.confidenceScore < 1).length;
  return {
    delta,
    deltaLine: `${delta >= 0 ? "+" : ""}${delta} points since ${new Date(first.recordedAt).toLocaleDateString()} (${history.length} measurements)`,
    thinCount,
    thinSampleNote: thinCount > 0
      ? `${thinCount} of ${history.length} historical points were recorded on a thin peer sample (low confidence) — a sharp dip there may be sampling, not regression.`
      : null,
    evidenceLine: last.rawMetric ? `Latest snapshot evidence: ${last.rawMetric}` : null,
  };
}
