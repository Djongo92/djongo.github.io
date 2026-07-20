// Per-market denominators and directory metadata for the Market Visibility
// Score. Same pattern as this repo's other flat config maps: one entry per
// market, imported wherever a formula needs a market-specific constant.
//
// Only these numbers vary by market — every scoring formula itself is
// market-independent code (see CLAUDE.md's scoring reference).
//
// Mirrored at supabase/functions/_shared/marketVisibilityConfig.ts for the
// edge functions (Deno can't import across the supabase/functions boundary
// into src/) — keep both copies in sync.

export interface ChambersConfig {
  /** Total number of practice-area tables Chambers tracks in this market — the denominator for count/N. */
  n: number;
  /** Deepest (worst) band Chambers publishes in this market — used to invert rank so 1 = best becomes the highest score. */
  deepestBand: number;
}

export interface TieredDirectoryConfig {
  /** Total number of practice-area tables this directory tracks in this market — the denominator for count/N. */
  n: number;
  /** Deepest (worst) tier this directory publishes in this market — used to invert rank so 1 = best becomes the highest score. */
  deepestTier: number;
}

export interface MarketConfig {
  chambers: ChambersConfig;
  legal500: TieredDirectoryConfig;
  iflr1000: TieredDirectoryConfig;
  /** Thought Leadership content window, in days, for posts/news cadence. */
  contentWindowDays: number;
}

// Serbia's numbers are independently verified table-by-table against the
// live Chambers Europe 2026 / Legal 500 EMEA 2026 sites (see the
// market_directory_data seed migration). Hungary and Romania are as
// published by a third party, not re-verified — treat them as reference
// values only until independently checked.
export const DMV_MARKETS: Record<string, MarketConfig> = {
  serbia: { chambers: { n: 7, deepestBand: 4 }, legal500: { n: 8, deepestTier: 4 }, iflr1000: { n: 2, deepestTier: 3 }, contentWindowDays: 60 },
  hungary: { chambers: { n: 13, deepestBand: 4 }, legal500: { n: 11, deepestTier: 4 }, iflr1000: { n: 4, deepestTier: 3 }, contentWindowDays: 60 },
  romania: { chambers: { n: 10, deepestBand: 4 }, legal500: { n: 15, deepestTier: 4 }, iflr1000: { n: 5, deepestTier: 3 }, contentWindowDays: 60 },
};

export const getMarketConfig = (market: string): MarketConfig | null => DMV_MARKETS[market] ?? null;

export type PeerGroup = "international" | "regional" | "local" | "localized_page" | "consultancy";

export const PEER_GROUPS: { value: PeerGroup; label: string }[] = [
  { value: "international", label: "International firm" },
  { value: "regional", label: "Regional firm" },
  { value: "local", label: "Local firm" },
  { value: "localized_page", label: "Localized page of a larger firm" },
  { value: "consultancy", label: "Consultancy legal arm" },
];

/** Maps a market_directory_data firm_type code onto the closest peer_group, for peer-set filtering. No mapping exists for localized_page. */
export const FIRM_TYPE_TO_PEER_GROUP: Record<string, PeerGroup> = {
  I: "international",
  R: "regional",
  L: "local",
  C: "consultancy",
};
