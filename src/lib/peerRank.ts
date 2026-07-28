// Pure computation half of the live-score teaser's peer-rank reveal — given
// an already-fetched directory-standing-index array (sorted descending by
// directoryPoints, same shape the Recognition Index leaderboard renders) and
// a matched firm name, find where that firm sits within its own peer group.
// Kept separate from the fetch in LiveScoreTeaser.tsx so this is unit
// testable without mocking fetch, matching this codebase's pure-formula
// convention (performanceFormula.ts, peerStats.ts, etc.).
import { FIRM_TYPE_TO_PEER_GROUP } from "./marketVisibilityConfig";

export interface DirectoryFirmEntry {
  firmName: string;
  firmType: string | null;
}

export interface PeerRank {
  peerGroupLabel: string;
  rank: number;
  peerGroupSize: number;
  marketSize: number;
  percentile: number;
}

const PEER_GROUP_LABEL: Record<string, string> = {
  international: "International",
  regional: "Regional",
  local: "Local",
  localized_page: "Localized-page",
  consultancy: "Consultancy",
};

export function computePeerRank(firms: DirectoryFirmEntry[], matchedFirmName: string): PeerRank | null {
  if (firms.length === 0) return null;

  const matchedIndex = firms.findIndex((f) => f.firmName === matchedFirmName);
  if (matchedIndex === -1) return null;
  const matched = firms[matchedIndex];

  const peerGroup = matched.firmType ? FIRM_TYPE_TO_PEER_GROUP[matched.firmType] : undefined;
  const peers = peerGroup ? firms.filter((f) => f.firmType && FIRM_TYPE_TO_PEER_GROUP[f.firmType] === peerGroup) : firms;
  const peerRank = peers.findIndex((f) => f.firmName === matchedFirmName) + 1;
  const rank = peerRank || matchedIndex + 1;
  const groupSize = peers.length || firms.length;

  return {
    peerGroupLabel: peerGroup ? PEER_GROUP_LABEL[peerGroup] ?? "peer" : "tracked",
    rank,
    peerGroupSize: peers.length,
    marketSize: firms.length,
    percentile: Math.round((1 - rank / groupSize) * 100),
  };
}
