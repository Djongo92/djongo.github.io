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
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { peerMaxFor } from "./peerMax.ts";

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

  const followers = Math.max(0, Math.floor(input.followers) || 0);
  const posts30d = Math.max(0, Math.floor(input.posts30d) || 0);
  const engagementRate = typeof input.engagementRate === "number" && input.engagementRate >= 0 ? input.engagementRate : null;

  const [followersPeerMax, postsPeerMax, erPeerMax] = await Promise.all([
    peerMaxFor(serviceClient, market, peerGroup, "social", "followers", followers),
    peerMaxFor(serviceClient, market, peerGroup, "social", "posts30d", posts30d),
    engagementRate !== null ? peerMaxFor(serviceClient, market, peerGroup, "social", "engagementRate", engagementRate) : Promise.resolve(0),
  ]);

  const followersScore = followersPeerMax > 0 ? 5 * (followers / followersPeerMax) : 0;
  const postsScore = postsPeerMax > 0 ? 5 * (posts30d / postsPeerMax) : 0;
  const erScore = engagementRate !== null && erPeerMax > 0 ? 6 * (engagementRate / erPeerMax) : 0;

  const platformCount = Object.values(input.platforms ?? {}).filter(Boolean).length;
  const platformScore = Math.min(4, platformCount);

  const score = Math.round((followersScore + postsScore + erScore + platformScore) * 100) / 100;

  return {
    score,
    raw: { followers, posts30d, engagementRate, platforms: input.platforms, platformCount },
    provenance: "self_reported",
  };
}
