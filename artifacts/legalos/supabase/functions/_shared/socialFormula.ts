// Pure Social Media category math (20 pts): no Deno globals, no network, no
// Supabase client — kept separate from socialScore.ts purely for
// consistency with the other categories' pure/impure split, and so it's
// trivially testable.
// 5×followers-ratio + 5×posts(30d)-ratio + 6×engagement-rate-ratio + 4×binary
// platform presence, where each ratio is p90Ratio() from percentileFormula.ts
// (1.0 at or above the peer group's 90th percentile) — NOT value/peer-max.
export const MAX_FOLLOWERS = 2_000_000;
export const MAX_POSTS_30D = 200;
export const MAX_ENGAGEMENT_RATE = 100;

export const clamp = (n: number, max: number): number => Math.min(Math.max(0, n), max);

export interface SocialPlatforms {
  linkedin: boolean;
  instagram: boolean;
  twitter: boolean;
  facebook: boolean;
}

export function calculateSocialScore(
  followersRatio: number,
  postsRatio: number,
  engagementRate: number | null,
  erRatio: number,
  platforms: SocialPlatforms,
): number {
  const followersScore = 5 * followersRatio;
  const postsScore = 5 * postsRatio;
  const erScore = engagementRate !== null ? 6 * erRatio : 0;

  const platformCount = Object.values(platforms ?? {}).filter(Boolean).length;
  const platformScore = Math.min(4, platformCount);

  return Math.round((followersScore + postsScore + erScore + platformScore) * 100) / 100;
}
