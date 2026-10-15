// Pure Social Presence category math (75 pts — weights in methodology.ts):
// no Deno globals, no network, no Supabase client — kept separate from
// socialScore.ts for the pure/impure split, and so it's trivially testable.
// LinkedIn followers, posting (30d) and engagement are each a p90Ratio()
// from percentileFormula.ts (1.0 at or above the peer group's 90th
// percentile); platform presence is the share of the tracked platforms the
// firm maintains.
import { SOCIAL_PLATFORM_COUNT, SOCIAL_WEIGHTS as W, round2 } from "./methodology.ts";
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
  const followersScore = W.followers * followersRatio;
  const postsScore = W.posting * postsRatio;
  const erScore = engagementRate !== null ? W.engagement * erRatio : 0;

  const platformCount = Object.values(platforms ?? {}).filter(Boolean).length;
  const platformScore = W.platforms * (Math.min(SOCIAL_PLATFORM_COUNT, platformCount) / SOCIAL_PLATFORM_COUNT);

  return round2(followersScore + postsScore + erScore + platformScore);
}
