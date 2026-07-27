// Social Media category (20 pts): 5×followers-ratio + 5×posts(30d)-ratio +
// 6×engagement-rate-ratio + 4×binary platform presence, where each ratio is
// p90Ratio() against the peer group's 90th percentile — see
// percentileFormula.ts for why this replaced dividing by the peer group's
// raw maximum.
//
// No clean LinkedIn API exists, so every number here is self-reported at
// intake (form fields, not scraped) — see CLAUDE.md Batch D item 11.
// Engagement rate is optional (only firms with their own LinkedIn analytics
// can supply a real one); when absent it simply contributes 0 rather than
// being estimated. Platform presence is 4 independent booleans, each worth
// 1 point — summing directly to the category's 4-point cap, no further
// normalization needed.
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

export interface SocialInput {
  followers: number;
  posts30d: number;
  engagementRate?: number;
  platforms: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
}

export interface SocialResult {
  score: number;
  raw: {
    followers?: number; posts30d?: number; engagementRate?: number | null;
    platforms?: SocialInput["platforms"]; platformCount?: number;
    followersStats?: PeerStats; postsStats?: PeerStats; erStats?: PeerStats | null;
  };
  provenance: "self_reported" | "missing";
}

export async function computeSocialScore(
  serviceClient: SupabaseClient,
  market: string,
  peerGroup: string,
  input: SocialInput | null,
  auditedDomain: string,
): Promise<SocialResult> {
  if (!input) return { score: 0, raw: {}, provenance: "missing" };

  const followers = clamp(Math.floor(input.followers) || 0, MAX_FOLLOWERS);
  const posts30d = clamp(Math.floor(input.posts30d) || 0, MAX_POSTS_30D);
  const engagementRate = typeof input.engagementRate === "number" && input.engagementRate >= 0
    ? clamp(input.engagementRate, MAX_ENGAGEMENT_RATE)
    : null;

  const [followersStats, postsStats, erStats] = await Promise.all([
    peerStatsFor(serviceClient, market, peerGroup, "social", "followers", followers, auditedDomain),
    peerStatsFor(serviceClient, market, peerGroup, "social", "posts30d", posts30d, auditedDomain),
    engagementRate !== null ? peerStatsFor(serviceClient, market, peerGroup, "social", "engagementRate", engagementRate, auditedDomain) : Promise.resolve(null as PeerStats | null),
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
    provenance: "self_reported",
  };
}
