// Server-side mirror of src/lib/marketVisibilityConfig.ts. Deno edge
// functions can't import across the supabase/functions boundary into src/,
// so the per-market denominators are duplicated here — keep both in sync.

export interface MarketConfig {
  chambers: { n: number; deepestBand: number };
  legal500: { n: number; deepestTier: number };
  iflr1000: { n: number; deepestTier: number };
  contentWindowDays: number;
}

export const DMV_MARKETS: Record<string, MarketConfig> = {
  serbia: { chambers: { n: 7, deepestBand: 4 }, legal500: { n: 8, deepestTier: 4 }, iflr1000: { n: 2, deepestTier: 3 }, contentWindowDays: 60 },
  hungary: { chambers: { n: 13, deepestBand: 4 }, legal500: { n: 11, deepestTier: 4 }, iflr1000: { n: 4, deepestTier: 3 }, contentWindowDays: 60 },
  romania: { chambers: { n: 10, deepestBand: 4 }, legal500: { n: 15, deepestTier: 4 }, iflr1000: { n: 5, deepestTier: 3 }, contentWindowDays: 60 },
};

export const getMarketConfig = (market: string): MarketConfig | null => DMV_MARKETS[market] ?? null;

export type PeerGroup = "international" | "regional" | "local" | "localized_page" | "consultancy";

/** Maps a market_directory_data firm_type code onto the closest peer_group, for peer-set filtering. No mapping exists for localized_page. */
export const FIRM_TYPE_TO_PEER_GROUP: Record<string, PeerGroup> = {
  I: "international",
  R: "regional",
  L: "local",
  C: "consultancy",
};
