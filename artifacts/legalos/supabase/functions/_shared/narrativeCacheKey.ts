/**
 * Cache key for visibility-audit-narrative. Every prompt-driving input must
 * be fingerprinted: two audits with the same total but different category
 * distributions — or different site-health flags — must never share a cached
 * brief, or the narrative describes the previous firm's pattern. Bump the
 * version prefix on any prompt-semantics change (v2 = 500-point scale).
 */

export interface NarrativeCacheKeyInput {
  domain: string;
  market: string;
  peerGroup: string;
  scaledTotal: number;
  measuredMax: number;
  clientId: string;
  categories: Record<string, { score: number; max: number; provenance: string }>;
  siteHealthIssues: string[];
}

// djb2 — non-crypto; only needs to be stable and well-distributed for keys.
function fingerprint(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function buildNarrativeCacheKey(input: NarrativeCacheKeyInput): string {
  const catFp = Object.keys(input.categories)
    .sort()
    .map((k) => {
      const c = input.categories[k];
      return `${k}:${c.score}/${c.max}:${c.provenance}`;
    })
    .join("|");
  const healthFp = [...input.siteHealthIssues].sort().join("|");
  return `https://cache.internal/v2/${encodeURIComponent(input.domain)}/${input.market}/${input.scaledTotal}/${input.measuredMax}/${input.clientId}/${fingerprint(catFp)}-${fingerprint(healthFp)}-${fingerprint(input.peerGroup)}`;
}
