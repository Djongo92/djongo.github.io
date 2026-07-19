// Orchestrates the full five-category Market Visibility Score: calls each
// category's scoring module directly in-process (not via HTTP — these are
// plain Deno module imports, avoiding a self-call antipattern), assembles
// the total, persists via service_role, and computes the live peer-group
// percentile against other published audits.
//
// SEO & Authority stays "not_configured" (hard-stopped on
// AHREFS_API_KEY/MOZ_API_KEY, per CLAUDE.md) so the rest of the audit
// still completes — nothing fabricates a total for a category that isn't
// wired up.
import { requireAccess, ACCESS_CORS_HEADERS } from "../_shared/access.ts";
import { normalizeUrl } from "../_shared/safeFetch.ts";
import { computePerformanceScore } from "../_shared/performanceScore.ts";
import { computeReputationScore } from "../_shared/reputationScore.ts";
import { computeThoughtLeadershipScore } from "../_shared/thoughtLeadershipScore.ts";
import { computeSocialScore, type SocialInput } from "../_shared/socialScore.ts";
import { computeSeoAuthorityScore } from "../_shared/seoScore.ts";
import { DMV_MARKETS } from "../_shared/marketVisibilityConfig.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = ACCESS_CORS_HEADERS;
const VALID_PEER_GROUPS = new Set(["international", "regional", "local", "localized_page", "consultancy"]);

async function computePercentile(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  market: string,
  peerGroup: string,
  totalScore: number,
): Promise<{ percentile: number; peerCount: number } | null> {
  const { data, error } = await serviceClient
    .from("market_visibility_audits")
    .select("total_score")
    .eq("market", market)
    .eq("peer_group", peerGroup)
    .eq("is_public", true);

  if (error || !data || data.length === 0) return null;

  const scores = (data as { total_score: number }[]).map((r) => r.total_score);
  const below = scores.filter((s) => s < totalScore).length;
  return { percentile: Math.round((below / scores.length) * 100), peerCount: scores.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const unauthorized = await requireAccess(req, corsHeaders, "benchmark");
  if (unauthorized) return unauthorized;

  try {
    const { clientId, auditedDomain, displayName, market, peerGroup, gbpListed, social: socialRaw } = await req.json();

    if (!clientId || typeof clientId !== "string") {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!auditedDomain || typeof auditedDomain !== "string") {
      return new Response(JSON.stringify({ error: "auditedDomain is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!market || typeof market !== "string" || !DMV_MARKETS[market]) {
      return new Response(JSON.stringify({ error: "Unsupported market" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!peerGroup || typeof peerGroup !== "string" || !VALID_PEER_GROUPS.has(peerGroup)) {
      return new Response(JSON.stringify({ error: "Invalid peerGroup" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const normalizedUrl = normalizeUrl(auditedDomain);

    const socialInput: SocialInput | null = socialRaw && typeof socialRaw === "object"
      ? {
        followers: Number(socialRaw.followers) || 0,
        posts30d: Number(socialRaw.posts30d) || 0,
        engagementRate: typeof socialRaw.engagementRate === "number" ? socialRaw.engagementRate : undefined,
        platforms: {
          linkedin: socialRaw.platforms?.linkedin === true,
          instagram: socialRaw.platforms?.instagram === true,
          twitter: socialRaw.platforms?.twitter === true,
          facebook: socialRaw.platforms?.facebook === true,
        },
      }
      : null;

    const [performance, reputation, thoughtLeadership, social] = await Promise.all([
      computePerformanceScore(normalizedUrl),
      computeReputationScore(serviceClient, market, auditedDomain, gbpListed === true),
      computeThoughtLeadershipScore(serviceClient, market, peerGroup, normalizedUrl),
      computeSocialScore(serviceClient, market, peerGroup, socialInput),
    ]);
    const seoAuthority = computeSeoAuthorityScore();

    const raw_metrics = {
      performance: performance.raw,
      social: social.raw,
      seoAuthority: seoAuthority.raw,
      thoughtLeadership: thoughtLeadership.raw,
      reputation: reputation.raw,
    };
    const provenance = {
      performance: performance.provenance,
      social: social.provenance,
      seoAuthority: seoAuthority.provenance,
      thoughtLeadership: thoughtLeadership.provenance,
      reputation: reputation.provenance,
    };

    const { data: savedRow, error: upsertError } = await serviceClient
      .from("market_visibility_audits")
      .upsert({
        client_id: clientId,
        audited_domain: auditedDomain,
        display_name: displayName ?? null,
        market,
        peer_group: peerGroup,
        performance_score: performance.score,
        social_score: social.score,
        seo_authority_score: seoAuthority.score,
        thought_leadership_score: thoughtLeadership.score,
        reputation_score: reputation.score,
        raw_metrics,
        provenance,
      }, { onConflict: "client_id,audited_domain,market" })
      .select("id, total_score, is_public")
      .single();

    if (upsertError || !savedRow) {
      console.error("visibility-audit-run upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Couldn't save the audit" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const percentileResult = await computePercentile(serviceClient, market, peerGroup, savedRow.total_score);

    return new Response(JSON.stringify({
      id: savedRow.id,
      isPublic: savedRow.is_public,
      totalScore: savedRow.total_score,
      categories: {
        performance: { score: performance.score, provenance: performance.provenance },
        social: { score: social.score, provenance: social.provenance },
        seoAuthority: { score: seoAuthority.score, provenance: seoAuthority.provenance },
        thoughtLeadership: { score: thoughtLeadership.score, provenance: thoughtLeadership.provenance },
        reputation: { score: reputation.score, provenance: reputation.provenance },
      },
      rawMetrics: raw_metrics,
      percentile: percentileResult?.percentile ?? null,
      peerCount: percentileResult?.peerCount ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visibility-audit-run error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
