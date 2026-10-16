// §7 — Peer groups: optional refinement dimensions offered at audit intake,
// alongside the required peer_group. Mirrored at
// supabase/functions/_shared/peerDimensions.ts for the edge functions (Deno
// can't import across the supabase/functions boundary into src/) — keep
// both copies in sync, same pattern as marketVisibilityConfig.ts.
export type FirmSize = "solo" | "boutique_2_10" | "mid_11_50" | "large_51_200" | "enterprise_200_plus";
export type OfficeCount = "single" | "multi";
export type ServiceModel = "full_service" | "boutique_specialist";
export type MarketTier = "tier1" | "tier2" | "tier3";

export const FIRM_SIZE_OPTIONS: { value: FirmSize; label: string }[] = [
  { value: "solo", label: "Solo practitioner" },
  { value: "boutique_2_10", label: "2-10 lawyers" },
  { value: "mid_11_50", label: "11-50 lawyers" },
  { value: "large_51_200", label: "51-200 lawyers" },
  { value: "enterprise_200_plus", label: "200+ lawyers" },
];

export const OFFICE_COUNT_OPTIONS: { value: OfficeCount; label: string }[] = [
  { value: "single", label: "Single office" },
  { value: "multi", label: "Multiple offices" },
];

export const SERVICE_MODEL_OPTIONS: { value: ServiceModel; label: string }[] = [
  { value: "full_service", label: "Full-service" },
  { value: "boutique_specialist", label: "Boutique / specialist" },
];

export const MARKET_TIER_OPTIONS: { value: MarketTier; label: string }[] = [
  { value: "tier1", label: "Tier 1 market" },
  { value: "tier2", label: "Tier 2 market" },
  { value: "tier3", label: "Tier 3 market" },
];
