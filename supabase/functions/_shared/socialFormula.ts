// Pure Social Media category math (20 pts): no Deno globals, no network, no
// Supabase client — kept separate from socialScore.ts purely for
// consistency with the other categories' pure/impure split, and so it's
// trivially testable.
// 5×followers/peer-max + 5×posts(30d)/peer-max + 6×engagement-rate/peer-max
// + 4×binary platform presence.
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
  followers: number,
  posts30d: number,
  engagementRate: number | null,
  platforms: SocialPlatforms,
  followersPeerMax: number,
  postsPeerMax: number,
  erPeerMax: number,
): number {
  const followersScore = followersPeerMax > 0 ? 5 * (followers / followersPeerMax) : 0;
  const postsScore = postsPeerMax > 0 ? 5 * (posts30d / postsPeerMax) : 0;
  const erScore = engagementRate !== null && erPeerMax > 0 ? 6 * (engagementRate / erPeerMax) : 0;

  const platformCount = Object.values(platforms ?? {}).filter(Boolean).length;
  const platformScore = Math.min(4, platformCount);

  return Math.round((followersScore + postsScore + erScore + platformScore) * 100) / 100;
}
