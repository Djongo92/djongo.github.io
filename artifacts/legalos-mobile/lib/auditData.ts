/**
 * DataContext's signed-in data load, extracted so its failure branch is
 * unit-testable with injected sources — same pattern as peerLeaderboard.ts.
 *
 * The bug this fixes: refresh()'s catch used to just log a warning and leave
 * a signed-in user looking at the fictional Petrović & Partners demo firm
 * with isDemo still true — nothing on screen said their real numbers failed
 * to load, so they could act on a fictional firm's score believing it was
 * theirs. Now any throw OR malformed response from visibility-audit-get
 * becomes an explicit { ok: false }, which the provider turns into a
 * visible couldn't-load state with a retry action.
 */
import { callFunction } from './supabase';
import { applyPeerResult, fetchPeerLeaderboard } from './peerLeaderboard';
import { computeMeasuredTotals } from './measuredScore';
import { getCategories } from './categories';
import type { AuditHistoryEntry, Firm, Provenance } from '@/context/DataContext';

// ─── API response shape ───────────────────────────────────────────────────────

export interface AuditRow {
  id: string;
  firm_name?: string;
  firm_domain?: string;
  audited_domain?: string;
  total_score?: number;
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
  percentile?: number | null;
  peer_count?: number;
  rank?: number;
  market?: string;
  // Freshness + thin-peer metadata for the leaderboard row badges — same
  // columns the peer list reads (updated_at / confidence_score / sample_size).
  updated_at?: string | null;
  confidence_score?: number | null;
  sample_size?: number | null;
  // Per-category provenance ("api", "estimated", "missing", ...) — same
  // column the web app reads via `select("*")` on market_visibility_audits.
  // A category absent here (or the whole object absent, for older rows)
  // is treated as "missing" rather than assumed measured.
  provenance?: Partial<Provenance>;
}

export interface HistoryRow {
  total_score?: number;
  recorded_at: string;
  // The edge function selects these for every history row; older rows may
  // carry nulls (raw_metrics predates the freeze).
  raw_metrics?: Record<string, any> | null;
  provenance?: Partial<Provenance> | null;
  confidence_score?: number | null;
  sample_size?: number | null;
}

export interface AuditGetResponse {
  audits?: AuditRow[];
  history?: HistoryRow[];
}

// ─── Injectable sources ───────────────────────────────────────────────────────

/** The external calls behind the signed-in load; tests inject fakes. */
export interface AuditSources {
  /** visibility-audit-get. Throws on HTTP failure; may return a bad body. */
  callAuditGet: (clientId: string, accessToken: string) => Promise<AuditGetResponse | null>;
  /** Peer leaderboard for the firm's market; null on failure (degrades). */
  fetchPeers: (market: string, currentDomain: string, liveFirm: Firm) => Promise<Firm[] | null>;
}

/** The real sources: the edge function + the peer-leaderboard helper. */
export const supabaseAuditSources: AuditSources = {
  callAuditGet: (clientId, accessToken) =>
    callFunction<AuditGetResponse>('visibility-audit-get', { clientId, accessToken }),
  fetchPeers: (market, currentDomain, liveFirm) =>
    fetchPeerLeaderboard(market, currentDomain, liveFirm),
};

// ─── Result ───────────────────────────────────────────────────────────────────

export type SignedInData =
  | {
      ok: true;
      /** False when the account simply has no audits yet — NOT a failure;
       *  the empty-account experience is a separate concern from a broken
       *  fetch, and conflating them would cry wolf on brand-new accounts. */
      hasAudit: boolean;
      firm: Firm | null;
      leaderboard: Firm[] | null;
      auditHistory: AuditHistoryEntry[];
    }
  | { ok: false; error: string };

/**
 * Load a signed-in user's audit data. Never throws: every failure —
 * network/HTTP throw, null or non-object body, non-array collections, or an
 * exception mid-mapping — returns { ok: false } so the provider can surface
 * it instead of silently rendering demo data.
 */
export async function loadSignedInData(
  clientId: string,
  accessToken: string,
  sources: AuditSources = supabaseAuditSources,
): Promise<SignedInData> {
  try {
    const data = await sources.callAuditGet(clientId, accessToken);

    // "Returns badly": a null/non-object body or non-array collections are a
    // broken response, not an empty account — fail explicitly.
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'visibility-audit-get returned an empty or non-object body' };
    }
    if (data.audits !== undefined && !Array.isArray(data.audits)) {
      return { ok: false, error: 'visibility-audit-get returned a malformed audits field' };
    }
    if (data.history !== undefined && !Array.isArray(data.history)) {
      return { ok: false, error: 'visibility-audit-get returned a malformed history field' };
    }

    const audits = data.audits ?? [];
    const latest = audits[0];

    let firm: Firm | null = null;
    let leaderboard: Firm[] | null = null;

    if (latest) {
      const percentile = latest.percentile ?? 50;

      // Build a provisional firm object from the audit row so we can pass
      // it to the peer fetch (needed to splice an unpublished firm into the
      // ranked list at its correct score position).
      const provisionalFirm: Firm = {
        id: latest.id,
        rank: 0, // overwritten below from market-list position
        name: latest.firm_name ?? 'Your Firm',
        domain: latest.firm_domain ?? latest.audited_domain ?? '',
        score: latest.total_score ?? 0,
        percentile,
        isYou: true,
        performance: latest.performance_score ?? 0,
        social: latest.social_score ?? 0,
        seoAuthority: latest.seo_authority_score ?? 0,
        thoughtLeadership: latest.thought_leadership_score ?? 0,
        reputation: latest.reputation_score ?? 0,
        provenance: {
          performance: latest.provenance?.performance ?? 'missing',
          social: latest.provenance?.social ?? 'missing',
          seoAuthority: latest.provenance?.seoAuthority ?? 'missing',
          thoughtLeadership: latest.provenance?.thoughtLeadership ?? 'missing',
          reputation: latest.provenance?.reputation ?? 'missing',
        },
        hasFullAudit: true,
        // Computed just below from the measured categories.
        visibilityPercent: 0,
        // Freshness + thin-peer flags so the firm's own leaderboard row shows
        // the same badges as its peers'.
        auditedAt: latest.updated_at ?? null,
        confidenceScore: latest.confidence_score ?? null,
        sampleSize: latest.sample_size ?? null,
      };

      // The leaderboard sorts on visibility percent (measured score ÷
      // measured max — a missing category shrinks the denominator, never
      // reads as an earned zero), so the firm's own entry must carry it.
      const selfMeasured = computeMeasuredTotals(getCategories(provisionalFirm));
      provisionalFirm.visibilityPercent =
        selfMeasured.measuredMax > 0
          ? Math.round((selfMeasured.score / selfMeasured.measuredMax) * 100)
          : 0;

      // Fetch the real peer leaderboard for this firm's market. A peer
      // failure DEGRADES (single-entry fallback inside applyPeerResult),
      // it must never fail the whole load — that was the pre-extraction
      // behavior via fetchPeerLeaderboard's internal catch.
      const market = latest.market ?? 'serbia';
      const peers = await sources
        .fetchPeers(market, provisionalFirm.domain, provisionalFirm)
        .catch(() => null);

      // Enrich the isYou entry with its real percentile (never overwriting
      // the market-list rank), or fall back to a single-entry list when the
      // fetch failed — both paths are unit-tested in peerLeaderboard.test.ts.
      const { leaderboard: rankedList, firm: rankedFirm } = applyPeerResult(peers, provisionalFirm, percentile);
      leaderboard = rankedList;
      firm = rankedFirm;
    }

    const history = data.history ?? [];
    const auditHistory: AuditHistoryEntry[] = history.map((h) => ({
      score: h.total_score ?? 0,
      recordedAt: h.recorded_at,
      rawMetrics: h.raw_metrics ?? null,
      provenance: h.provenance ?? null,
      confidenceScore: h.confidence_score ?? null,
      sampleSize: h.sample_size ?? null,
    }));

    return { ok: true, hasAudit: !!latest, firm, leaderboard, auditHistory };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
