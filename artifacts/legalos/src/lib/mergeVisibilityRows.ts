// Merges the two real data sources behind the public leaderboard into one
// list: firms that ran and published a full audit (market_visibility_audits)
// and every firm Chambers/Legal 500/IFLR1000 tracks whether or not they've
// ever run one (directory-standing-index). A firm appearing in both is
// shown once, via its richer full-audit row — the directory-only entry
// exists only for firms with no matching audit.
//
// Every row gets one fair "visibility percent": measured score ÷ measured
// max, never against a flat denominator a firm was never able to reach.
// A directory-only firm's max is capped at the directory's own ceiling
// (DIRECTORY_MAX, not the full Recognition category) since its Google
// Business Profile isn't part of the directory data — not "missing," just
// not applicable to a firm that's never engaged with the product at all.
import { computeMeasuredTotals } from "./measuredScore";
import { findWeakestCategoryTool } from "./categoryToolMap";
import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "./visibilityCategories";
import { FIRM_TYPE_TO_PEER_GROUP } from "./marketVisibilityConfig";
import { isStale, AUDIT_STALE_AFTER_DAYS, DIRECTORY_STALE_AFTER_DAYS } from "./scoreFreshness";
import { isLowConfidenceSample } from "./confidenceBand";

export interface MergeAuditRow {
  audited_domain: string;
  display_name: string | null;
  peer_group: string;
  verified_at: string | null;
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
  provenance?: Record<string, string>;
  /** Carries raw_metrics.reputation.directoryLastVerifiedAt through from the
   *  audits table — the matched market_directory_data row's own
   *  last_verified_at, reviewed quarterly rather than refreshed
   *  automatically. Lets an audited firm's staleness flag reflect a stale
   *  directory input even when its own audit (verified_at) is recent. */
  raw_metrics?: { reputation?: { directoryLastVerifiedAt?: string | null } } | null;
}

export interface MergeDirectoryFirm {
  firmName: string;
  firmDomain: string | null;
  firmType: string | null;
  directoryPoints: number;
  /** Reflects market_directory_data.last_verified_at — reviewed quarterly by
   * design (CLAUDE.md's Decided #3), so this ages on a longer clock than an
   * audit's own verified_at. */
  lastVerifiedAt?: string | null;
}

export interface CombinedVisibilityRow {
  firmName: string;
  firmDomain: string | null;
  peerGroup: string;
  hasFullAudit: boolean;
  verified: boolean;
  measuredScore: number;
  measuredMax: number;
  visibilityPercent: number;
  measuredCategoryCount: number;
  weakestCategoryLabel: string | null;
  /** True past AUDIT_STALE_AFTER_DAYS since verified_at, OR past
   * DIRECTORY_STALE_AFTER_DAYS since the matched directory row's
   * last_verified_at — an audited firm's own Reputation score is partly
   * built from directory data, so a fresh audit doesn't clear this if that
   * underlying directory data is itself overdue for its quarterly review.
   * Directory-only firms (no audit) are judged purely on the latter. */
  isStale: boolean;
  /** True once this row's peer group has fewer than LOW_SAMPLE_THRESHOLD
   * firms in this same merged list — a percentile-shaped stat computed
   * from a handful of firms shouldn't read as precise. Filled in after
   * merging, once every row's final peer group is known. */
  isLowConfidence: boolean;
  peerGroupSampleSize: number;
  /** Per-category detail for the expandable row on the public index —
   *  only set for full-audit rows (a directory-only row has exactly one
   *  measured input, its directory points, so there's nothing to expand).
   *  `measured: false` means the category was excluded from the
   *  denominator entirely, never rendered as an earned zero. */
  categoryBreakdown?: { key: CategoryKey; label: string; score: number; max: number; measured: boolean }[];
}

const normalizeDomain = (d: string | null | undefined): string | null => (d ? d.trim().toLowerCase() : null);

function fromAuditRow(row: MergeAuditRow, now: number): Omit<CombinedVisibilityRow, "isLowConfidence" | "peerGroupSampleSize"> {
  const categories = {
    performance: { score: row.performance_score ?? 0, provenance: row.provenance?.performance ?? "missing" },
    social: { score: row.social_score ?? 0, provenance: row.provenance?.social ?? "missing" },
    seoAuthority: { score: row.seo_authority_score ?? 0, provenance: row.provenance?.seoAuthority ?? "missing" },
    thoughtLeadership: { score: row.thought_leadership_score ?? 0, provenance: row.provenance?.thoughtLeadership ?? "missing" },
    reputation: { score: row.reputation_score ?? 0, provenance: row.provenance?.reputation ?? "missing" },
  };
  const measured = computeMeasuredTotals(categories);
  const measuredCategoryCount = 5 - measured.excludedLabels.length;
  const weakest = measuredCategoryCount >= 2 ? findWeakestCategoryTool(categories) : null;
  const categoryBreakdown = CATEGORY_ORDER.map((key: CategoryKey) => {
    const cat = categories[key];
    return {
      key,
      label: CATEGORY_META[key].label,
      score: cat.provenance === "missing" ? 0 : cat.score,
      max: CATEGORY_META[key].max,
      measured: cat.provenance !== "missing",
    };
  });

  return {
    firmName: row.display_name || row.audited_domain,
    firmDomain: row.audited_domain,
    peerGroup: row.peer_group,
    hasFullAudit: true,
    verified: !!row.verified_at,
    measuredScore: measured.score,
    measuredMax: measured.measuredMax,
    visibilityPercent: measured.measuredMax > 0 ? Math.round((measured.score / measured.measuredMax) * 100) : 0,
    measuredCategoryCount,
    weakestCategoryLabel: weakest?.categoryLabel ?? null,
    categoryBreakdown,
    isStale:
      isStale(row.verified_at, AUDIT_STALE_AFTER_DAYS, now) ||
      isStale(row.raw_metrics?.reputation?.directoryLastVerifiedAt, DIRECTORY_STALE_AFTER_DAYS, now),
  };
}

function fromDirectoryFirm(
  firm: MergeDirectoryFirm,
  directoryMax: number,
  now: number,
): Omit<CombinedVisibilityRow, "isLowConfidence" | "peerGroupSampleSize"> {
  return {
    firmName: firm.firmName,
    firmDomain: firm.firmDomain,
    peerGroup: firm.firmType ? FIRM_TYPE_TO_PEER_GROUP[firm.firmType] ?? "other" : "other",
    hasFullAudit: false,
    verified: false,
    measuredScore: firm.directoryPoints,
    measuredMax: directoryMax,
    visibilityPercent: directoryMax > 0 ? Math.round((firm.directoryPoints / directoryMax) * 100) : 0,
    measuredCategoryCount: 1,
    weakestCategoryLabel: null,
    isStale: isStale(firm.lastVerifiedAt, DIRECTORY_STALE_AFTER_DAYS, now),
  };
}

export function mergeVisibilityRows(
  auditRows: MergeAuditRow[],
  directoryFirms: MergeDirectoryFirm[],
  directoryMax: number,
  now: number = Date.now(),
): CombinedVisibilityRow[] {
  const auditedDomains = new Set(auditRows.map((r) => normalizeDomain(r.audited_domain)).filter(Boolean));

  const auditedResults = auditRows.map((r) => fromAuditRow(r, now));
  const directoryOnlyResults = directoryFirms
    .filter((f) => {
      const d = normalizeDomain(f.firmDomain);
      return !d || !auditedDomains.has(d);
    })
    .map((f) => fromDirectoryFirm(f, directoryMax, now));

  const combined = [...auditedResults, ...directoryOnlyResults];

  // Peer-group sample size is only knowable once every row's final peer
  // group has been resolved (directory-only rows derive theirs from
  // firmType above) — computed here, not per-row above, for exactly that
  // reason.
  const groupCounts = new Map<string, number>();
  for (const row of combined) {
    groupCounts.set(row.peerGroup, (groupCounts.get(row.peerGroup) ?? 0) + 1);
  }

  return combined
    .map((row) => {
      const peerGroupSampleSize = groupCounts.get(row.peerGroup) ?? 0;
      return { ...row, peerGroupSampleSize, isLowConfidence: isLowConfidenceSample(peerGroupSampleSize) };
    })
    .sort((a, b) => b.visibilityPercent - a.visibilityPercent);
}
