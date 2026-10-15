// §7 — Peer groups: the optional refinement dimensions self-reported at
// audit intake (see the 20260728020000_peer_dimensions migration's comment
// for why these are separate from peer_group, and separate from a firm's
// chosen competitor set). Mirrored at src/lib/peerDimensions.ts for the
// frontend intake form — keep both copies in sync (same pattern as
// marketVisibilityConfig.ts).
export type FirmSize = "solo" | "boutique_2_10" | "mid_11_50" | "large_51_200" | "enterprise_200_plus";
export type OfficeCount = "single" | "multi";
export type ServiceModel = "full_service" | "boutique_specialist";
export type MarketTier = "tier1" | "tier2" | "tier3";

export const FIRM_SIZES: FirmSize[] = ["solo", "boutique_2_10", "mid_11_50", "large_51_200", "enterprise_200_plus"];
export const OFFICE_COUNTS: OfficeCount[] = ["single", "multi"];
export const SERVICE_MODELS: ServiceModel[] = ["full_service", "boutique_specialist"];
export const MARKET_TIERS: MarketTier[] = ["tier1", "tier2", "tier3"];

export interface PeerRefinementInput {
  firmSize?: unknown;
  officeCount?: unknown;
  serviceModel?: unknown;
  specialization?: unknown;
  marketTier?: unknown;
}

export interface PeerRefinement {
  firmSize: FirmSize | null;
  officeCount: OfficeCount | null;
  serviceModel: ServiceModel | null;
  specialization: string | null;
  marketTier: MarketTier | null;
}

const asEnum = <T extends string>(value: unknown, valid: T[]): T | null =>
  typeof value === "string" && (valid as string[]).includes(value) ? (value as T) : null;

/** Validates raw intake input into a clean refinement object — invalid or
 *  absent values become null rather than an error, since every one of
 *  these fields is optional and a bad value shouldn't fail the whole audit. */
export function parsePeerRefinement(input: PeerRefinementInput): PeerRefinement {
  return {
    firmSize: asEnum(input.firmSize, FIRM_SIZES),
    officeCount: asEnum(input.officeCount, OFFICE_COUNTS),
    serviceModel: asEnum(input.serviceModel, SERVICE_MODELS),
    specialization: typeof input.specialization === "string" && input.specialization.trim() ? input.specialization.trim().slice(0, 40) : null,
    marketTier: asEnum(input.marketTier, MARKET_TIERS),
  };
}
