// SEO & Authority category (60 pts): 6 Ahrefs/Moz metrics, each
// 10×value/peer-group-max.
//
// AHREFS_API_KEY / MOZ_API_KEY are hard-stop secrets per CLAUDE.md — not
// present in Supabase secrets, and unlike PAGESPEED_API_KEY (a documented
// free Google API this repo could safely wire up sight-unseen) these are
// paid subscriptions with a specific vendor contract this build hasn't
// confirmed. So this stays a shell: it degrades to "not_configured"
// rather than failing the audit, and the six-metric formula is deferred
// until a human adds a key and the exact response shape can be verified
// against it — Performance/Reputation/Thought Leadership score in full
// regardless.
export interface SeoResult {
  score: number;
  raw: Record<string, unknown>;
  provenance: "missing";
  status: "not_configured" | "api";
}

export function computeSeoAuthorityScore(): SeoResult {
  const ahrefsKey = Deno.env.get("AHREFS_API_KEY");
  const mozKey = Deno.env.get("MOZ_API_KEY");

  if (!ahrefsKey && !mozKey) {
    return { score: 0, raw: {}, provenance: "missing", status: "not_configured" };
  }

  // Not implemented — see the module comment above.
  console.warn("[visibility-audit-seo] a key is configured but the 6-metric formula isn't wired up yet");
  return { score: 0, raw: {}, provenance: "missing", status: "not_configured" };
}
