// Reputation category (55 pts): GBP (up to 10 pts) + Chambers + IFLR1000 +
// Legal500, each worth 15 pts split as 10×(count/N) +
// 5×(peer-group 90th-percentile-normalized inverted band/tier average).
//
// GBP scoring is now live-data-first:
//   1. Check firm_signals for a 'google_places' row (pre-fetched by the weekly
//      firm-signals-refresh job). If present and fresh, score it using the rich
//      10-pt GbpScoreFormula (rating, review count, completeness).
//   2. If no Places signal exists, fall back to the self-reported gbpListed
//      boolean from intake (binary 10 or 0), preserving the pre-launch
//      behaviour unchanged.
//
// count/N uses the fixed per-market denominator N from marketVisibilityConfig
// (breadth: how many of the market's tracked tables the firm appears in) —
// not peer-relative, so it's untouched by the p90 methodology change below.
// The band/tier average IS peer-relative: rank 1 = best is inverted, then
// benchmarked against the 90th percentile of inverted averages among firms
// of the same firm_type in market_directory_data (the full 44-firm-style
// directory harvest, not other users' audit runs — Reputation's quality
// signal comes entirely from the static directory data, so it's fully
// computable on audit #1 rather than waiting for peer audits to accumulate).
// Below MIN_PEER_SAMPLE firms in that firm_type, the comparison widens to
// the whole market before falling back to a low-confidence flag — see
// percentileFormula.ts for why this replaced dividing by the peer maximum.
//
// market_directory_data is service_role-only, so this must run inside an
// edge function with the service-role client already created by the caller.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DMV_MARKETS, FIRM_TYPE_TO_PEER_GROUP, type PeerGroup } from "./marketVisibilityConfig.ts";
import { computePeerStats, p90Ratio, MIN_PEER_SAMPLE, type PeerStats } from "./percentileFormula.ts";
import { getFirmSignal, normalizeDomain } from "./firmSignals.ts";
import { calculateGbpScore, type GbpDetails } from "./gbpScoreFormula.ts";

export interface DirectoryRow {
  firm_name: string;
  firm_domain: string | null;
  firm_type: string | null;
  chambers: { rankedTables?: Record<string, number> } | null;
  legal500: { rankedTables?: Record<string, number> } | null;
  iflr1000: { rankedTables?: Record<string, number> } | null;
  /** Read by both directoryStandingIndex.ts's public passthrough and, below,
   * the fuzzy-match/scoring path in this file — the matched row's age is
   * surfaced in the returned raw metrics so an audited firm's Reputation
   * breakdown can flag when the underlying directory data (reviewed
   * quarterly, not refreshed automatically) is overdue for review. */
  last_verified_at?: string | null;
}

export interface ReputationResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "api" | "missing";
  directory: "matched" | "pending";
}

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const normalizeName = (s: string) =>
  stripDiacritics(s.toLowerCase())
    .replace(/\([^)]*\)/g, " ") // drop parenthetical aliases for the primary comparison
    .replace(/[.,&'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parentheticalAlias = (s: string): string | null => {
  const m = s.match(/\(([^)]*)\)/);
  return m ? normalizeName(m[1]) : null;
};

const tokenSet = (s: string) => new Set(s.split(" ").filter((t) => t.length > 2));

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Fuzzy-matches a domain-or-name against the directory's firm_name (and any parenthetical alias). */
export function fuzzyMatchFirm(query: string, rows: DirectoryRow[]): DirectoryRow | null {
  const target = normalizeName(query);
  if (!target) return null;

  // 1. Exact match on primary name or parenthetical alias.
  for (const row of rows) {
    const primary = normalizeName(row.firm_name);
    const alias = parentheticalAlias(row.firm_name);
    if (primary === target || alias === target) return row;
  }

  // 2. Substring match either direction.
  for (const row of rows) {
    const primary = normalizeName(row.firm_name);
    const alias = parentheticalAlias(row.firm_name);
    if (primary.includes(target) || target.includes(primary)) return row;
    if (alias && (alias.includes(target) || target.includes(alias))) return row;
  }

  // 3. Token-overlap best match above a conservative threshold.
  const targetTokens = tokenSet(target);
  let best: { row: DirectoryRow; score: number } | null = null;
  for (const row of rows) {
    const primaryTokens = tokenSet(normalizeName(row.firm_name));
    const alias = parentheticalAlias(row.firm_name);
    const score = Math.max(jaccard(targetTokens, primaryTokens), alias ? jaccard(targetTokens, tokenSet(alias)) : 0);
    if (score > 0.5 && (!best || score > best.score)) best = { row, score };
  }
  return best?.row ?? null;
}

export function directoryScore(
  rankedTables: Record<string, number> | undefined,
  n: number,
  deepest: number,
  peerInvertedAvgs: number[],
  widened = false,
): { points: number; count: number; avgRank: number | null; qualityStats: PeerStats | null } {
  const entries = Object.entries(rankedTables ?? {});
  const count = entries.length;
  const countScore = Math.min(10, 10 * (count / n));

  if (count === 0) return { points: countScore, count, avgRank: null, qualityStats: null };

  const avgRank = entries.reduce((sum, [, rank]) => sum + rank, 0) / entries.length;
  const invertedAvg = deepest + 1 - avgRank;
  const qualityStats = computePeerStats([...peerInvertedAvgs, invertedAvg], invertedAvg, { widened });
  const qualityScore = 5 * p90Ratio(qualityStats);

  return { points: countScore + qualityScore, count, avgRank, qualityStats };
}

export function invertedAvgFor(rankedTables: Record<string, number> | undefined, deepest: number): number {
  const entries = Object.entries(rankedTables ?? {});
  if (entries.length === 0) return 0;
  const avgRank = entries.reduce((sum, [, rank]) => sum + rank, 0) / entries.length;
  return deepest + 1 - avgRank;
}

export async function computeReputationScore(
  serviceClient: SupabaseClient,
  market: string,
  domainOrName: string,
  gbpListed: boolean,
): Promise<ReputationResult> {
  const marketConfig = DMV_MARKETS[market];

  // GBP score: prefer live Places signal from firm_signals (pre-fetched by the
  // weekly firm-signals-refresh job); fall back to the self-reported boolean.
  let gbpScore = gbpListed ? 10 : 0;
  let gbpFromPlaces = false;
  let gbpRating: number | null = null;
  let gbpReviewCount: number | null = null;
  let gbpOperational: boolean | null = null;
  let gbpScoreBreakdown: { operationalPts: number; ratingPts: number; reviewPts: number; completenessPts: number } | null = null;
  const domain = normalizeDomain(domainOrName);
  if (domain) {
    try {
      const placesSignal = await getFirmSignal(serviceClient, domain, "google_places");
      if (placesSignal) {
        if (placesSignal.is_unverifiable) {
          // Can't determine GBP status (no listing found / API error) — treat
          // as missing rather than zero so we don't penalise for bot protection.
          gbpScore = 0;
        } else {
          const details = placesSignal.payload.details as GbpDetails | null;
          const gbpResult = calculateGbpScore(details);
          gbpScore = gbpResult.score;
          gbpScoreBreakdown = gbpResult.breakdown;
          if (details) {
            gbpRating = details.rating ?? null;
            gbpReviewCount = details.reviewCount ?? null;
            gbpOperational = details.businessStatus === "OPERATIONAL";
          }
        }
        gbpFromPlaces = true;
      }
    } catch (e) {
      console.warn("[visibility-audit-reputation] firm_signals GBP lookup failed, using self-reported value:", e);
    }
  }

  // Shared GBP raw fields — included on every return path so the UI can
  // always show why the GBP sub-score is what it is, even when the directory
  // lookup has not yet matched (pending/missing states).
  const gbpRaw = {
    gbpListed,
    gbpScore,
    gbpSource: gbpFromPlaces ? "google_places_api" : "self_reported",
    gbpRating,
    gbpReviewCount,
    gbpOperational,
    gbpScoreBreakdown,
  } as const;

  if (!marketConfig) {
    return { score: gbpScore, raw: gbpRaw, provenance: "missing", directory: "pending" };
  }

  const { data, error } = await serviceClient
    .from("market_directory_data")
    .select("firm_name, firm_domain, firm_type, chambers, legal500, iflr1000, last_verified_at")
    .eq("market", market);

  if (error || !data) {
    console.error("[visibility-audit-reputation] directory query failed:", error);
    return { score: gbpScore, raw: gbpRaw, provenance: "missing", directory: "pending" };
  }

  const rows = data as DirectoryRow[];
  // Domain-first matching: audits arrive with a domain ("bdkadvokati.com"),
  // which never fuzzy-matches a firm name ("BDK Advokati") — the tokens
  // don't overlap. The harvest captured firm_domain precisely so this cheap,
  // exact step runs before the name heuristics.
  const byDomain = domain ? rows.find((r) => r.firm_domain && normalizeDomain(r.firm_domain) === domain) : undefined;
  const matched = byDomain ?? fuzzyMatchFirm(domainOrName, rows);

  if (!matched) {
    await serviceClient.from("directory_lookup_requests").insert({ market, firm_domain_or_name: domainOrName });
    return { score: gbpScore, raw: gbpRaw, provenance: "missing", directory: "pending" };
  }

  // Peer set: same firm_type when the harvest recorded one, else the whole
  // market — excluding the matched firm itself, since directoryScore() adds
  // its own inverted average back in separately; leaving it in `peers` here
  // would double-count it and inflate the reported sample size. Minimum
  // sample rule: below MIN_PEER_SAMPLE firms (including self) in that
  // firm_type, widen to the whole market before the quality sub-score falls
  // back to a low-confidence flag on whatever sample remains.
  const others = rows.filter((r) => r !== matched);
  const peerGroup: PeerGroup | undefined = matched.firm_type ? FIRM_TYPE_TO_PEER_GROUP[matched.firm_type] : undefined;
  let peers = peerGroup ? others.filter((r) => r.firm_type && FIRM_TYPE_TO_PEER_GROUP[r.firm_type] === peerGroup) : others;
  let widened = false;
  if (peers.length + 1 < MIN_PEER_SAMPLE && peers.length < others.length) {
    peers = others;
    widened = true;
  }

  const chambersPeerAvgs = peers.map((r) => invertedAvgFor(r.chambers?.rankedTables, marketConfig.chambers.deepestBand));
  const legal500PeerAvgs = peers.map((r) => invertedAvgFor(r.legal500?.rankedTables, marketConfig.legal500.deepestTier));
  const iflrPeerAvgs = peers.map((r) => invertedAvgFor(r.iflr1000?.rankedTables, marketConfig.iflr1000.deepestTier));

  const chambers = directoryScore(matched.chambers?.rankedTables, marketConfig.chambers.n, marketConfig.chambers.deepestBand, chambersPeerAvgs, widened);
  const legal500 = directoryScore(matched.legal500?.rankedTables, marketConfig.legal500.n, marketConfig.legal500.deepestTier, legal500PeerAvgs, widened);
  const iflr1000 = directoryScore(matched.iflr1000?.rankedTables, marketConfig.iflr1000.n, marketConfig.iflr1000.deepestTier, iflrPeerAvgs, widened);

  const score = Math.round((gbpScore + chambers.points + legal500.points + iflr1000.points) * 100) / 100;

  return {
    score,
    raw: {
      gbpListed,
      gbpScore,
      gbpSource: gbpFromPlaces ? "google_places_api" : "self_reported",
      // Google Places detail fields — populated when gbpSource is
      // "google_places_api"; null when falling back to self-reported.
      gbpRating,
      gbpReviewCount,
      gbpOperational,
      gbpScoreBreakdown,
      matchedFirmName: matched.firm_name,
      matchedFirmDomain: matched.firm_domain,
      // Chambers/Legal 500/IFLR1000 standing is reviewed quarterly, not
      // refreshed automatically (unlike firm_signals) — this lets the UI
      // flag a firm's Reputation sub-score as built on data overdue for its
      // next review, the same way firm_signals staleness is flagged.
      directoryLastVerifiedAt: matched.last_verified_at ?? null,
      chambers, legal500, iflr1000,
      // Per-practice-area ranks, not just the aggregate points/count/avgRank
      // above — lets the UI show exactly which tables a firm is ranked in,
      // not just a blended number.
      chambersRankedTables: matched.chambers?.rankedTables ?? null,
      legal500RankedTables: matched.legal500?.rankedTables ?? null,
      iflr1000RankedTables: matched.iflr1000?.rankedTables ?? null,
    },
    provenance: "api",
    directory: "matched",
  };
}
