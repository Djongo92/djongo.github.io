// Social Presence category (75 pts — weights in methodology.ts): followers,
// posts (30d), and engagement-rate ratios plus platform presence, where each ratio is
// p90Ratio() against the peer group's 90th percentile — see
// percentileFormula.ts for why this replaced dividing by the peer group's
// raw maximum.
//
// No clean LinkedIn API exists, so every number here is self-reported at
// intake (form fields, not scraped) — see CLAUDE.md Batch D item 11.
// Engagement rate is optional (only firms with their own LinkedIn analytics
// can supply a real one); when absent it simply contributes 0 rather than
// being estimated. Platform presence is 4 independent booleans, each an
// equal share of the platform weight — no peer normalization needed.
//
// Because followers/posts30d/engagementRate feed a LIVE peer-group
// comparison (peerStatsFor reads other published audits, not a fixed
// denominator), one bad-faith or fat-fingered submission could otherwise
// distort the field for the peer group. Clamp self-reported values to
// generous but sane ceilings before they can ever reach peerStatsFor or get
// persisted — and since scoring now benchmarks against the 90th percentile
// rather than the raw max, a single outlier submission can no longer crush
// everyone else's score outright either way.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { peerStatsFor } from "./peerStats.ts";
import { p90Ratio, type PeerStats } from "./percentileFormula.ts";
import { calculateSocialScore, clamp, MAX_FOLLOWERS, MAX_POSTS_30D, MAX_ENGAGEMENT_RATE } from "./socialFormula.ts";
import type { FirmSize } from "./peerDimensions.ts";

export interface SocialInput {
  followers: number;
  posts30d: number;
  engagementRate?: number;
  platforms: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
}

/**
 * Builds the intake SocialInput, or null when the submission carries no
 * usable numerics. A bare `{}` (or a platforms-only object) is NOT a
 * self-report: treating it as one would fabricate zero-follower rows that
 * outrank researcher-verified directory data in the audit pipeline and get
 * persisted as real peer-pool observations. An explicit numeric zero IS a
 * valid self-report (the firm told us it has no followers).
 */
export function parseSocialIntake(socialRaw: unknown): SocialInput | null {
  if (!socialRaw || typeof socialRaw !== "object") return null;
  const raw = socialRaw as Record<string, unknown>;
  // Strict scalar parsing: only real numbers and non-empty trimmed numeric
  // strings count. Number() alone would coerce " " → 0, true → 1, [] → 0 —
  // a malformed submission must fall through to directory research, not
  // masquerade as a self-reported zero.
  const asNumber = (v: unknown): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };
  const followers = asNumber(raw.followers);
  const posts30d = asNumber(raw.posts30d);
  if (!Number.isFinite(followers) && !Number.isFinite(posts30d)) return null;
  const platforms = raw.platforms as Record<string, unknown> | undefined;
  return {
    followers: Number.isFinite(followers) ? followers : 0,
    posts30d: Number.isFinite(posts30d) ? posts30d : 0,
    engagementRate: typeof raw.engagementRate === "number" ? raw.engagementRate : undefined,
    platforms: {
      linkedin: platforms?.linkedin === true,
      instagram: platforms?.instagram === true,
      twitter: platforms?.twitter === true,
      facebook: platforms?.facebook === true,
    },
  };
}

export interface SocialResult {
  score: number;
  raw: {
    followers?: number; posts30d?: number; engagementRate?: number | null;
    platforms?: SocialInput["platforms"]; platformCount?: number;
    followersStats?: PeerStats; postsStats?: PeerStats; erStats?: PeerStats | null;
  };
  provenance: "self_reported" | "detected" | "directory" | "missing";
}

export async function computeSocialScore(
  serviceClient: SupabaseClient,
  market: string,
  peerGroup: string,
  input: SocialInput | null,
  auditedDomain: string,
  firmSize?: FirmSize | null,
  // "detected" when the input was derived from homepage link detection
  // rather than intake — presence-only data, so the label must not claim
  // the firm reported it. "directory" when the numerics came from the
  // researcher-verified market directory (e.g. the 2026-08 LinkedIn census
  // ingest) — full numeric scoring, but not firm-reported.
  source: "self_reported" | "detected" | "directory" = "self_reported",
): Promise<SocialResult> {
  if (!input) return { score: 0, raw: {}, provenance: "missing" };

  // Detected presence is presence-ONLY: followers/posts/engagement are
  // unknown, not zero. Persisting 0s would let peerStatsFor read them as
  // real measurements from published audits and drag the live peer pool's
  // median/p90 down — so the detected path scores just the platform
  // dimension and persists no numeric metrics at all.
  if (source === "detected") {
    const platformCount = Object.values(input.platforms ?? {}).filter(Boolean).length;
    return {
      score: calculateSocialScore(0, 0, null, 0, input.platforms),
      raw: { platforms: input.platforms, platformCount },
      provenance: "detected",
    };
  }

  const followers = clamp(Math.floor(input.followers) || 0, MAX_FOLLOWERS);
  const posts30d = clamp(Math.floor(input.posts30d) || 0, MAX_POSTS_30D);
  const engagementRate = typeof input.engagementRate === "number" && input.engagementRate >= 0
    ? clamp(input.engagementRate, MAX_ENGAGEMENT_RATE)
    : null;

  const [followersStats, postsStats, erStats] = await Promise.all([
    peerStatsFor(serviceClient, market, peerGroup, "social", "followers", followers, auditedDomain, firmSize),
    peerStatsFor(serviceClient, market, peerGroup, "social", "posts30d", posts30d, auditedDomain, firmSize),
    engagementRate !== null ? peerStatsFor(serviceClient, market, peerGroup, "social", "engagementRate", engagementRate, auditedDomain, firmSize) : Promise.resolve(null as PeerStats | null),
  ]);

  const score = calculateSocialScore(
    p90Ratio(followersStats),
    p90Ratio(postsStats),
    engagementRate,
    erStats ? p90Ratio(erStats) : 0,
    input.platforms,
  );
  const platformCount = Object.values(input.platforms ?? {}).filter(Boolean).length;

  return {
    score,
    // Full six-value peer stats (raw value, peer median, 90th-percentile
    // threshold, highest observed, sample size, comparison date) persisted
    // per metric — not just the blended score — so a client can re-derive
    // this exact formula later (a "what-if I had more followers" simulator,
    // a methodology audit) without a live peerStatsFor query it has no
    // access to, and so a managing partner can audit the number instead of
    // just arguing with it.
    raw: {
      followers, posts30d, engagementRate, platforms: input.platforms, platformCount,
      followersStats, postsStats, erStats,
    },
    provenance: source,
  };
}
