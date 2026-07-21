// The actual Market Visibility Score orchestration — calls each category's
// scoring module in-process, assembles the total, persists via
// service_role, and computes the live peer-group percentile. Extracted out
// of visibility-audit-run's HTTP handler so visibility-audit-rerun-due can
// call the exact same path for a scheduled re-run instead of a second,
// drift-prone reimplementation.
//
// SEO & Authority stays "not_configured" (hard-stopped on
// AHREFS_API_KEY/MOZ_API_KEY, per CLAUDE.md) so the rest of the audit
// still completes — nothing fabricates a total for a category that isn't
// wired up.
import { normalizeUrl } from "./safeFetch.ts";
import { computePerformanceScore } from "./performanceScore.ts";
import { checkSiteHealth } from "./siteHealth.ts";
import { computeReputationScore } from "./reputationScore.ts";
import { computeThoughtLeadershipScore } from "./thoughtLeadershipScore.ts";
import { computeSocialScore, type SocialInput } from "./socialScore.ts";
import { computeSeoAuthorityScore } from "./seoScore.ts";
import { checkBenchmarkRateLimit } from "./rateLimit.ts";

export const VALID_PEER_GROUPS = new Set(["international", "regional", "local", "localized_page", "consultancy"]);

export interface RunVisibilityAuditParams {
  clientId: string;
  auditedDomain: string;
  displayName?: string | null;
  market: string;
  peerGroup: string;
  gbpListed: boolean;
  social?: unknown;
}

export interface RunVisibilityAuditResult {
  ok: boolean;
  status: number;
  error?: string;
  payload?: {
    id: string;
    isPublic: boolean;
    totalScore: number;
    categories: Record<string, { score: number; provenance: string }>;
    rawMetrics: Record<string, unknown>;
    percentile: number | null;
    peerCount: number;
  };
}

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

export async function runVisibilityAudit(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  { clientId, auditedDomain, displayName, market, peerGroup, gbpListed, social: socialRaw }: RunVisibilityAuditParams,
): Promise<RunVisibilityAuditResult> {
  // Caps how often a single client can trigger the PSI/Gemini-backed audit —
  // applies to scheduled re-runs too, so a bug in the scheduler can't turn
  // into runaway spend.
  const { allowed } = await checkBenchmarkRateLimit(serviceClient, clientId);
  if (!allowed) {
    return { ok: false, status: 429, error: "Daily audit limit reached for this client." };
  }

  const normalizedUrl = normalizeUrl(auditedDomain);

  const socialInput: SocialInput | null = socialRaw && typeof socialRaw === "object"
    ? {
      followers: Number((socialRaw as Record<string, unknown>).followers) || 0,
      posts30d: Number((socialRaw as Record<string, unknown>).posts30d) || 0,
      engagementRate: typeof (socialRaw as Record<string, unknown>).engagementRate === "number"
        ? (socialRaw as Record<string, number>).engagementRate
        : undefined,
      platforms: {
        linkedin: (socialRaw as { platforms?: Record<string, unknown> }).platforms?.linkedin === true,
        instagram: (socialRaw as { platforms?: Record<string, unknown> }).platforms?.instagram === true,
        twitter: (socialRaw as { platforms?: Record<string, unknown> }).platforms?.twitter === true,
        facebook: (socialRaw as { platforms?: Record<string, unknown> }).platforms?.facebook === true,
      },
    }
    : null;

  const [performance, reputation, thoughtLeadership, social, siteHealth] = await Promise.all([
    computePerformanceScore(normalizedUrl),
    computeReputationScore(serviceClient, market, auditedDomain, gbpListed === true),
    computeThoughtLeadershipScore(serviceClient, market, peerGroup, normalizedUrl),
    computeSocialScore(serviceClient, market, peerGroup, socialInput),
    checkSiteHealth(normalizedUrl),
  ]);
  const seoAuthority = computeSeoAuthorityScore();

  // siteHealth is informational only — not peer-normalized, not part of the
  // 200-pt score, never blocks the audit if the crawl fails (null).
  const raw_metrics = {
    performance: performance.raw,
    social: social.raw,
    seoAuthority: seoAuthority.raw,
    thoughtLeadership: thoughtLeadership.raw,
    reputation: reputation.raw,
    siteHealth,
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
      last_intake: { gbpListed: gbpListed === true, social: socialInput },
    }, { onConflict: "client_id,audited_domain,market" })
    .select("id, total_score, is_public")
    .single();

  if (upsertError || !savedRow) {
    console.error("runVisibilityAudit upsert error:", upsertError);
    return { ok: false, status: 500, error: "Couldn't save the audit" };
  }

  // Append-only snapshot so a returning firm can see their own score over
  // time — the upsert above overwrites the same row, so this is the only
  // history that exists. Logged, never blocks the response if it fails.
  const { error: historyError } = await serviceClient
    .from("market_visibility_audit_history")
    .insert({
      client_id: clientId,
      audited_domain: auditedDomain,
      market,
      peer_group: peerGroup,
      performance_score: performance.score,
      social_score: social.score,
      seo_authority_score: seoAuthority.score,
      thought_leadership_score: thoughtLeadership.score,
      reputation_score: reputation.score,
      total_score: savedRow.total_score,
    });
  if (historyError) console.error("runVisibilityAudit history insert error:", historyError);

  const percentileResult = await computePercentile(serviceClient, market, peerGroup, savedRow.total_score);

  return {
    ok: true,
    status: 200,
    payload: {
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
    },
  };
}
