// Reputation category (55 pts): 10×GBP binary (self-reported) + Chambers +
// IFLR1000 + Legal500, each worth 15 pts split as 10×(count/N) +
// 5×(peer-group-normalized inverted band/tier average).
//
// count/N uses the fixed per-market denominator N from marketVisibilityConfig
// (breadth: how many of the market's tracked tables the firm appears in).
// The band/tier average is peer-group-normalized: rank 1 = best is inverted,
// then divided by the highest inverted average among firms of the same
// firm_type in market_directory_data (the full 44-firm-style directory
// harvest, not other users' audit runs — Reputation's quality signal comes
// entirely from the static directory data, so it's fully computable on
// audit #1 rather than waiting for peer audits to accumulate).
//
// market_directory_data is service_role-only, so this must run inside an
// edge function with the service-role client already created by the caller.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DMV_MARKETS, FIRM_TYPE_TO_PEER_GROUP, type PeerGroup } from "./marketVisibilityConfig.ts";

export interface DirectoryRow {
  firm_name: string;
  firm_domain: string | null;
  firm_type: string | null;
  chambers: { rankedTables?: Record<string, number> } | null;
  legal500: { rankedTables?: Record<string, number> } | null;
  iflr1000: { rankedTables?: Record<string, number> } | null;
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
): { points: number; count: number; avgRank: number | null } {
  const entries = Object.entries(rankedTables ?? {});
  const count = entries.length;
  const countScore = Math.min(10, 10 * (count / n));

  if (count === 0) return { points: countScore, count, avgRank: null };

  const avgRank = entries.reduce((sum, [, rank]) => sum + rank, 0) / entries.length;
  const invertedAvg = deepest + 1 - avgRank;
  const peerMax = Math.max(invertedAvg, ...peerInvertedAvgs);
  const qualityScore = peerMax > 0 ? 5 * (invertedAvg / peerMax) : 0;

  return { points: countScore + qualityScore, count, avgRank };
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
  const gbpScore = gbpListed ? 10 : 0;

  if (!marketConfig) {
    return { score: gbpScore, raw: { gbpListed }, provenance: "missing", directory: "pending" };
  }

  const { data, error } = await serviceClient
    .from("market_directory_data")
    .select("firm_name, firm_domain, firm_type, chambers, legal500, iflr1000")
    .eq("market", market);

  if (error || !data) {
    console.error("[visibility-audit-reputation] directory query failed:", error);
    return { score: gbpScore, raw: { gbpListed }, provenance: "missing", directory: "pending" };
  }

  const rows = data as DirectoryRow[];
  const matched = fuzzyMatchFirm(domainOrName, rows);

  if (!matched) {
    await serviceClient.from("directory_lookup_requests").insert({ market, firm_domain_or_name: domainOrName });
    return { score: gbpScore, raw: { gbpListed }, provenance: "missing", directory: "pending" };
  }

  // Peer set: same firm_type when the harvest recorded one, else the whole market.
  const peerGroup: PeerGroup | undefined = matched.firm_type ? FIRM_TYPE_TO_PEER_GROUP[matched.firm_type] : undefined;
  const peers = peerGroup ? rows.filter((r) => r.firm_type && FIRM_TYPE_TO_PEER_GROUP[r.firm_type] === peerGroup) : rows;

  const chambersPeerAvgs = peers.map((r) => invertedAvgFor(r.chambers?.rankedTables, marketConfig.chambers.deepestBand));
  const legal500PeerAvgs = peers.map((r) => invertedAvgFor(r.legal500?.rankedTables, marketConfig.legal500.deepestTier));
  const iflrPeerAvgs = peers.map((r) => invertedAvgFor(r.iflr1000?.rankedTables, marketConfig.iflr1000.deepestTier));

  const chambers = directoryScore(matched.chambers?.rankedTables, marketConfig.chambers.n, marketConfig.chambers.deepestBand, chambersPeerAvgs);
  const legal500 = directoryScore(matched.legal500?.rankedTables, marketConfig.legal500.n, marketConfig.legal500.deepestTier, legal500PeerAvgs);
  const iflr1000 = directoryScore(matched.iflr1000?.rankedTables, marketConfig.iflr1000.n, marketConfig.iflr1000.deepestTier, iflrPeerAvgs);

  const score = Math.round((gbpScore + chambers.points + legal500.points + iflr1000.points) * 100) / 100;

  return {
    score,
    raw: { gbpListed, matchedFirmName: matched.firm_name, matchedFirmDomain: matched.firm_domain, chambers, legal500, iflr1000 },
    provenance: "api",
    directory: "matched",
  };
}
