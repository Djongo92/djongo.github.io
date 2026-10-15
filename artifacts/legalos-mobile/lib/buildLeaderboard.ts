/**
 * Pure helpers: merge the two real leaderboard sources into the mobile app's
 * Firm[] — published full audits (market_visibility_audits) plus every firm
 * Chambers/Legal 500/IFLR1000 tracks whether or not they've ever run one
 * (directory-standing-index) — assign 1-based market-wide ranks, and mark
 * the signed-in firm with isYou = true.
 *
 * Mirrors the web app's mergeVisibilityRows
 * (artifacts/legalos/src/lib/mergeVisibilityRows.ts): a firm present in both
 * sources appears once via its richer full-audit row, and every row ranks by
 * "visibility percent" — measured score ÷ measured max, never against a
 * denominator the firm couldn't reach — so mobile and web rank the same
 * market snapshot the same way. Directory-only rows cap at the directory's
 * own ceiling (45, not the audited Reputation category's 55): GBP status
 * genuinely isn't knowable for a firm that's never engaged with the product.
 *
 * Extracted from DataContext so it can be unit-tested without a live
 * Supabase connection or React context.
 */
import type { Firm, Provenance } from '@/context/DataContext';
import { computeMeasuredTotals } from './measuredScore';

/** Columns selected from market_visibility_audits for the peer list. */
export interface PeerAuditRow {
  id: string;
  audited_domain: string;
  display_name: string | null;
  total_score: number | null;
  performance_score: number | null;
  social_score: number | null;
  seo_authority_score: number | null;
  thought_leadership_score: number | null;
  reputation_score: number | null;
  provenance: Record<string, string> | null;
  /** When this audit was last scored — drives the row's "stale data" flag.
   *  Same column the web reads for freshness (updated_at). */
  updated_at?: string | null;
  /** Fraction (0-1) of peer-normalized metrics that met the minimum sample
   *  rule; < 1 flags a thin peer group. Nullable on pre-v2 rows. */
  confidence_score?: number | null;
  /** Smallest peer-comparison sample behind any metric. Nullable. */
  sample_size?: number | null;
}

/** One firm from the public directory-standing-index edge function. */
export interface DirectoryIndexFirm {
  firmName: string;
  firmDomain: string | null;
  directoryPoints: number;
}

/**
 * Public directory index ceiling — DIRECTORY_INDEX_MAX in
 * artifacts/legalos/supabase/functions/_shared/directoryStandingIndex.ts.
 */
export const DIRECTORY_INDEX_MAX = 45;

// Category point ceilings — must stay in sync with getCategories in
// DataContext (importing it here would be a module cycle).
const CATEGORY_MAX = {
  performance: 20,
  social: 20,
  seoAuthority: 60,
  thoughtLeadership: 45,
  reputation: 55,
} as const;

const normDomain = (d: string) => d.trim().toLowerCase();

function provFrom(prov: Record<string, string> | null): Provenance {
  const p = prov ?? {};
  return {
    performance: p['performance'] ?? 'missing',
    social: p['social'] ?? 'missing',
    seoAuthority: p['seoAuthority'] ?? 'missing',
    thoughtLeadership: p['thoughtLeadership'] ?? 'missing',
    reputation: p['reputation'] ?? 'missing',
  };
}

/** Measured score ÷ measured max for an audit row — the web leaderboard's sort metric. */
function percentFromAuditRow(row: PeerAuditRow): number {
  const prov = provFrom(row.provenance);
  const measured = computeMeasuredTotals([
    { label: 'Performance', score: row.performance_score ?? 0, max: CATEGORY_MAX.performance, provenance: prov.performance },
    { label: 'Social Media', score: row.social_score ?? 0, max: CATEGORY_MAX.social, provenance: prov.social },
    { label: 'SEO & Authority', score: row.seo_authority_score ?? 0, max: CATEGORY_MAX.seoAuthority, provenance: prov.seoAuthority },
    { label: 'Thought Leadership', score: row.thought_leadership_score ?? 0, max: CATEGORY_MAX.thoughtLeadership, provenance: prov.thoughtLeadership },
    { label: 'Reputation', score: row.reputation_score ?? 0, max: CATEGORY_MAX.reputation, provenance: prov.reputation },
  ]);
  return measured.measuredMax > 0 ? Math.round((measured.score / measured.measuredMax) * 100) : 0;
}

function firmFromAuditRow(row: PeerAuditRow): Firm {
  const domain = row.audited_domain ?? '';
  return {
    id: row.id,
    rank: 0, // assigned after the merged sort
    name: row.display_name ?? domain,
    domain,
    score: row.total_score ?? 0,
    // Percentile is not computable from the public list (no peer_group
    // breakdown). Callers should enrich the isYou entry with the real
    // percentile from visibility-audit-get after calling this function.
    percentile: 0,
    visibilityPercent: percentFromAuditRow(row),
    hasFullAudit: true,
    performance: row.performance_score ?? 0,
    social: row.social_score ?? 0,
    seoAuthority: row.seo_authority_score ?? 0,
    thoughtLeadership: row.thought_leadership_score ?? 0,
    reputation: row.reputation_score ?? 0,
    provenance: provFrom(row.provenance),
    // Freshness + thin-peer metadata for the row badges — nullable on pre-v2
    // rows (confidence_score/sample_size were added later) and absent
    // timestamps simply render no stale flag, never a fabricated "fresh".
    auditedAt: row.updated_at ?? null,
    confidenceScore: row.confidence_score ?? null,
    sampleSize: row.sample_size ?? null,
  };
}

function firmFromDirectory(f: DirectoryIndexFirm, directoryMax: number): Firm {
  return {
    id: `dir-${f.firmDomain ? normDomain(f.firmDomain) : f.firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    rank: 0, // assigned after the merged sort
    name: f.firmName,
    domain: f.firmDomain ?? '',
    score: f.directoryPoints,
    percentile: 0,
    visibilityPercent: directoryMax > 0 ? Math.round((f.directoryPoints / directoryMax) * 100) : 0,
    hasFullAudit: false,
    performance: 0,
    social: 0,
    seoAuthority: 0,
    thoughtLeadership: 0,
    reputation: 0,
    provenance: {
      performance: 'missing',
      social: 'missing',
      seoAuthority: 'missing',
      thoughtLeadership: 'missing',
      reputation: 'missing',
    },
  };
}

/**
 * Build the market-ranked Firm[] from raw audit rows + directory firms.
 *
 * Ordering is by visibility percent (measured score ÷ measured max) — the
 * same fair denominator the web Visibility Index sorts by — so a firm with
 * an unmeasurable category is not punished for it, and a directory-only
 * firm (measured on the directory's 45-point scale) competes on its percent
 * rather than its raw points. Ties break on absolute score, then name, so
 * the ordering is deterministic.
 *
 * If the signed-in firm's domain is found in the audit rows it is marked
 * isYou=true at its natural market position. If it is absent (audit not
 * published yet) it is spliced in at the position its percent belongs and
 * ranks are renumbered; a directory row for the same domain is skipped so
 * the firm never appears twice.
 *
 * The returned list always carries the signed-in firm so rank-derived
 * features ("N pts to reach #M") work regardless of publication status.
 *
 * NOTE: ranks in the returned list reflect the whole market population, not
 * the narrower peer_group used by visibility-audit-get's percentile. Callers
 * must NOT replace these ranks with a percentile-derived value — that would
 * produce duplicates and cause the "firm above" lookup to miss.
 */
export function buildMergedLeaderboard(
  rows: PeerAuditRow[],
  directoryFirms: DirectoryIndexFirm[],
  currentDomain: string,
  liveFirm: Firm,
  directoryMax: number = DIRECTORY_INDEX_MAX,
): Firm[] {
  const currentNorm = normDomain(currentDomain);
  const auditedDomains = new Set(
    rows.map((r) => normDomain(r.audited_domain ?? '')).filter(Boolean),
  );

  const firms: Firm[] = [
    ...rows.map(firmFromAuditRow),
    ...directoryFirms
      .filter((f) => {
        const d = f.firmDomain ? normDomain(f.firmDomain) : null;
        // Keep directory-only rows: firms with no matching audit. Domain-less
        // directory rows can't be matched, so they're always kept (same rule
        // as the web merge). The signed-in firm's own domain is excluded
        // either way — it enters below via its richer live entry.
        return !d || (!auditedDomains.has(d) && d !== currentNorm);
      })
      .map((f) => firmFromDirectory(f, directoryMax)),
  ];

  firms.sort(
    (a, b) =>
      b.visibilityPercent - a.visibilityPercent ||
      b.score - a.score ||
      a.name.localeCompare(b.name),
  );

  let foundSelf = false;
  firms.forEach((f, idx) => {
    f.rank = idx + 1;
    f.isYou = f.hasFullAudit && !!f.domain && normDomain(f.domain) === currentNorm;
    if (f.isYou) foundSelf = true;
  });

  if (!foundSelf) {
    // Audit exists but isn't published yet — insert at the position its
    // visibility percent belongs so rank-derived features still work.
    const insertAt = firms.findIndex((f) => f.visibilityPercent < liveFirm.visibilityPercent);
    const position = insertAt === -1 ? firms.length : insertAt;
    firms.splice(position, 0, { ...liveFirm, rank: 0 });
    firms.forEach((f, idx) => { f.rank = idx + 1; });
  }

  return firms;
}
