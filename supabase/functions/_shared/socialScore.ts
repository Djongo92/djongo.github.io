// Social Media category (20 pts): 5×followers/peer-max + 5×posts(30d)/peer-max
// + 6×engagement-rate/peer-max + 4×binary platform presence.
//
// No clean LinkedIn API exists, so every number here is self-reported at
// intake (form fields, not scraped) — see CLAUDE.md Batch D item 11.
// Engagement rate is optional (only firms with their own LinkedIn analytics
// can supply a real one); when absent it simply contributes 0 rather than
// being estimated. Platform presence is 4 independent booleans, each worth
// 1 point — summing directly to the category's 4-point cap, no further
// normalization needed.
//
// Because followers/posts30d/engagementRate feed a LIVE peer-group max
// (peerMaxFor reads other published audits, not a fixed denominator), one
// bad-faith or fat-fingered submission would otherwise permanently crush
// every other firm's score in that peer group — the max only ever grows.
// Clamp self-reported values to generous but sane ceilings before they can
// ever reach peerMaxFor or get persisted.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { peerMaxFor } from "./peerMax.ts";
import { calculateSocialScore, clamp, MAX_FOLLOWERS, MAX_POSTS_30D, MAX_ENGAGEMENT_RATE } from "./socialFormula.ts";

export interface SocialInput {
  followers: number;
  posts30d: number;
  engagementRate?: number;
  platforms: { linkedin: boolean; instagram: boolean; twitter: boolean; facebook: boolean };
}

export interface SocialResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "self_reported" | "missing";
}

export async function computeSocialScore(
  serviceClient: SupabaseClient,
  market: string,
  peerGroup: string,
  input: SocialInput | null,
): Promise<SocialResult> {
  if (!input) return { score: 0, raw: {}, provenance: "missing" };

  const followers = clamp(Math.floor(input.followers) || 0, MAX_FOLLOWERS);
  const posts30d = clamp(Math.floor(input.posts30d) || 0, MAX_POSTS_30D);
  const engagementRate = typeof input.engagementRate === "number" && input.engagementRate >= 0
    ? clamp(input.engagementRate, MAX_ENGAGEMENT_RATE)
    : null;

  const [followersPeerMax, postsPeerMax, erPeerMax] = await Promise.all([
    peerMaxFor(serviceClient, market, peerGroup, "social", "followers", followers),
    peerMaxFor(serviceClient, market, peerGroup, "social", "posts30d", posts30d),
    engagementRate !== null ? peerMaxFor(serviceClient, market, peerGroup, "social", "engagementRate", engagementRate) : Promise.resolve(0),
  ]);

  const score = calculateSocialScore(followers, posts30d, engagementRate, input.platforms, followersPeerMax, postsPeerMax, erPeerMax);
  const platformCount = Object.values(input.platforms ?? {}).filter(Boolean).length;

  return {
    score,
    // Peer-max denominators are persisted alongside the raw inputs (not just
    // the blended score) so a client can re-run this exact formula later —
    // a "what-if I had more followers" simulator, a methodology change —
    // without needing a live peerMaxFor query it has no access to.
    raw: {
      followers, posts30d, engagementRate, platforms: input.platforms, platformCount,
      followersPeerMax, postsPeerMax, erPeerMax,
    },
    provenance: "self_reported",
  };
}
