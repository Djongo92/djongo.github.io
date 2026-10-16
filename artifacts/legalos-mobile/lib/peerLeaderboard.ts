/**
 * DataContext's peer-leaderboard wiring, extracted so its failure paths can
 * be unit-tested without a live Supabase connection or React context.
 * Before this extraction, a regression here (a bad query change, a market
 * typo) silently gave signed-in users a blank or broken rankings screen.
 *
 * The two external calls are injectable (PeerSources) so tests can drive
 * each failure mode directly; production uses supabasePeerSources.
 */
import { buildMergedLeaderboard } from './buildLeaderboard';
import type { DirectoryIndexFirm, PeerAuditRow } from './buildLeaderboard';
import type { Firm } from '@/context/DataContext';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

/** The two external sources behind the peer leaderboard. */
export interface PeerSources {
  /** Published full audits for a market. error or null data on failure. */
  queryAudits: (market: string) => Promise<{ data: PeerAuditRow[] | null; error: unknown }>;
  /** Directory-tracked firms for a market; null on failure (best-effort). */
  fetchDirectory: (market: string) => Promise<DirectoryIndexFirm[] | null>;
}

/** The real sources: Supabase + the public directory-standing-index function. */
export const supabasePeerSources: PeerSources = {
  queryAudits: async (market) => {
    const { data, error } = await supabase
      .from('market_visibility_audits')
      .select('id, audited_domain, display_name, total_score, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, provenance, updated_at, confidence_score, sample_size')
      .eq('market', market)
      .eq('is_public', true);
    return { data: data as PeerAuditRow[] | null, error };
  },
  fetchDirectory: async (market) => {
    try {
      // Public, anonymous-allowlisted (IP-rate-limited) endpoint — the anon
      // key suffices, same as the web app's call.
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/directory-standing-index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ market }),
      });
      if (!resp.ok) return null;
      const body = await resp.json();
      return (body?.firms ?? []) as DirectoryIndexFirm[];
    } catch {
      return null;
    }
  },
};

/**
 * Fetch the public peer leaderboard for a market from BOTH sources the web
 * app's MarketIndex uses: published full audits and directory-tracked firms.
 * Without the second source the mobile leaderboard is a subset of the web
 * one and a signed-in firm's apparent rank differs between the surfaces.
 *
 * The directory call is best-effort: its failure degrades the leaderboard to
 * audits-only rather than losing the whole screen. Returns null ONLY when
 * the audits query fails, so the caller can fall back to a minimal
 * single-entry list instead of an empty screen.
 */
export async function fetchPeerLeaderboard(
  market: string,
  currentDomain: string,
  liveFirm: Firm,
  sources: PeerSources = supabasePeerSources,
): Promise<Firm[] | null> {
  try {
    const [auditResult, directoryFirms] = await Promise.all([
      sources.queryAudits(market),
      sources.fetchDirectory(market).catch(() => null),
    ]);
    if (auditResult.error || !auditResult.data) return null;
    return buildMergedLeaderboard(auditResult.data, directoryFirms ?? [], currentDomain, liveFirm);
  } catch (e) {
    console.warn('[peerLeaderboard] fetch failed:', e);
    return null;
  }
}

/**
 * Fold the peer-leaderboard result into the signed-in firm's displayed state.
 *
 * Peers present: splice the real percentile onto the isYou entry ONLY — the
 * public list can't compute it (no peer_group breakdown) — and sync
 * firm.rank to the market-list position. Ranks are NEVER overwritten from
 * the percentile: it is scoped to a narrower peer_group than the market
 * population ranks, and mixing the two produces duplicate ranks and breaks
 * the "firm above" lookup on the score tab.
 *
 * Peers null (Supabase failed): fall back to a single-entry list carrying
 * the live firm, so the rankings screen shows something rather than blank.
 * rank=1 is a safe placeholder — no peer exists to compare against in this
 * fallback list.
 */
export function applyPeerResult(
  peers: Firm[] | null,
  liveFirm: Firm,
  percentile: number,
): { leaderboard: Firm[]; firm: Firm } {
  if (!peers) {
    const fallback = { ...liveFirm, rank: 1 };
    return { leaderboard: [fallback], firm: fallback };
  }
  const leaderboard = peers.map((f) => (f.isYou ? { ...f, percentile } : f));
  const selfEntry = leaderboard.find((f) => f.isYou);
  const firm = { ...liveFirm, rank: selfEntry?.rank ?? liveFirm.rank };
  return { leaderboard, firm };
}
