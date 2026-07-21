// Computes a Directory Standing score for every firm in market_directory_data
// — Chambers + Legal 500 + IFLR1000 breadth-and-quality, the exact same math
// reputationScore.ts applies to a single audited firm, just run across the
// whole market at once. Deliberately excludes the 10-pt GBP component: GBP
// status is self-reported at audit time and we don't have it for firms that
// have never run one, so this index only covers what's derivable from
// public directory data alone — max 45, not the full 55-pt Reputation
// category. That's what makes it work with zero cold-start: every firm in
// the directory gets a real number without ever touching this product.
import { DMV_MARKETS, FIRM_TYPE_TO_PEER_GROUP, type PeerGroup } from "./marketVisibilityConfig.ts";
import { directoryScore, invertedAvgFor, type DirectoryRow } from "./reputationScore.ts";

export interface FirmDirectoryStanding {
  firmName: string;
  firmDomain: string | null;
  firmType: string | null;
  chambers: { points: number; count: number; avgRank: number | null };
  legal500: { points: number; count: number; avgRank: number | null };
  iflr1000: { points: number; count: number; avgRank: number | null };
  directoryPoints: number;
}

export const DIRECTORY_INDEX_MAX = 45;

export function computeDirectoryStandingIndex(market: string, rows: DirectoryRow[]): FirmDirectoryStanding[] {
  const marketConfig = DMV_MARKETS[market];
  if (!marketConfig) return [];

  return rows
    .map((firm) => {
      const peerGroup: PeerGroup | undefined = firm.firm_type ? FIRM_TYPE_TO_PEER_GROUP[firm.firm_type] : undefined;
      const peers = peerGroup ? rows.filter((r) => r.firm_type && FIRM_TYPE_TO_PEER_GROUP[r.firm_type] === peerGroup) : rows;

      const chambersPeerAvgs = peers.map((r) => invertedAvgFor(r.chambers?.rankedTables, marketConfig.chambers.deepestBand));
      const legal500PeerAvgs = peers.map((r) => invertedAvgFor(r.legal500?.rankedTables, marketConfig.legal500.deepestTier));
      const iflrPeerAvgs = peers.map((r) => invertedAvgFor(r.iflr1000?.rankedTables, marketConfig.iflr1000.deepestTier));

      const chambers = directoryScore(firm.chambers?.rankedTables, marketConfig.chambers.n, marketConfig.chambers.deepestBand, chambersPeerAvgs);
      const legal500 = directoryScore(firm.legal500?.rankedTables, marketConfig.legal500.n, marketConfig.legal500.deepestTier, legal500PeerAvgs);
      const iflr1000 = directoryScore(firm.iflr1000?.rankedTables, marketConfig.iflr1000.n, marketConfig.iflr1000.deepestTier, iflrPeerAvgs);

      return {
        firmName: firm.firm_name,
        firmDomain: firm.firm_domain,
        firmType: firm.firm_type,
        chambers,
        legal500,
        iflr1000,
        directoryPoints: Math.round((chambers.points + legal500.points + iflr1000.points) * 100) / 100,
      };
    })
    .sort((a, b) => b.directoryPoints - a.directoryPoints);
}
