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
import { normalizeDomain } from "./firmSignals.ts";
import { computePerformanceScore } from "./performanceScore.ts";
import { checkSiteHealth } from "./siteHealth.ts";
import { computeReputationScore } from "./reputationScore.ts";
import { computeThoughtLeadershipScore } from "./thoughtLeadershipScore.ts";
import { computeSocialScore, parseSocialIntake, type SocialInput } from "./socialScore.ts";
import { detectSocialPlatforms } from "./socialPresenceDetect.ts";
import { computeSeoAuthorityScore } from "./seoScore.ts";
import { checkBenchmarkRateLimit } from "./rateLimit.ts";
import { DMV_MARKETS } from "./marketVisibilityConfig.ts";
import type { PeerStats } from "./percentileFormula.ts";
import { METHODOLOGY_VERSION, computeAuditConfidence, computeDataWindow } from "./auditMetadata.ts";
import { parsePeerRefinement, type PeerRefinementInput } from "./peerDimensions.ts";

export const VALID_PEER_GROUPS = new Set(["international", "regional", "local", "localized_page", "consultancy"]);

/**
 * Researcher-verified LinkedIn numerics ingested into the market directory
 * (see the 20260813010000_directory_linkedin_ingest migration). Returns null
 * when the directory has no usable numbers for this domain — the caller then
 * falls back to homepage presence detection. Only real numbers are ever
 * returned: the peer pool reads these values from frozen audits, so unknown
 * must stay unknown, never zero.
 */
async function lookupDirectoryLinkedIn(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  market: string,
  auditedDomain: string,
): Promise<{ followers: number; posts30d: number } | null> {
  const domain = normalizeDomain(auditedDomain);
  if (!domain) return null;
  const { data, error } = await serviceClient
    .from("market_directory_data")
    .select("linkedin")
    .eq("market", market)
    .eq("firm_domain", domain)
    .maybeSingle();
  if (error) {
    console.warn("[runVisibilityAudit] directory linkedin lookup failed:", error.message);
    return null;
  }
  const li = (data as { linkedin?: Record<string, unknown> } | null)?.linkedin;
  // Attribution gate (mirrors the linkedin_shape_chk constraint): only
  // records confirmed against the firm's own company page may score —
  // anything else is an unknown and must fall back to presence detection.
  if (li?.attribution !== "confirmed_company_page") return null;
  const followers = typeof li?.followers === "number" ? li.followers : NaN;
  const posts30d = typeof li?.posts30d === "number" ? li.posts30d : NaN;
  if (!Number.isFinite(followers) || !Number.isFinite(posts30d)) return null;
  return { followers, posts30d };
}

export interface RunVisibilityAuditParams {
  clientId: string;
  auditedDomain: string;
  displayName?: string | null;
  market: string;
  peerGroup: string;
  gbpListed: boolean;
  social?: unknown;
  // §7 — optional peer-group refinement dimensions, self-reported at intake
  // (see the peer_dimensions migration for why these are separate from
  // peer_group). All optional — omitting them scores exactly as before.
  firmSize?: unknown;
  officeCount?: unknown;
  serviceModel?: unknown;
  specialization?: unknown;
  marketTier?: unknown;
  // Internal batch paths only (census-audit-run): skips the per-client daily
  // audit cap. Fail-closed by construction — visibility-audit-run's HTTP
  // handler never forwards a caller-supplied value into this field, so only
  // in-process callers that pass it explicitly can bypass the limit.
  skipRateLimit?: boolean;
  // Internal batch paths may bypass only the per-client cap while retaining
  // the per-firm refresh lease. This is used by outage recovery so two
  // concurrent recovery workers cannot pay for the same firm.
  skipClientRateLimit?: boolean;
  // Internal batch paths only: per-request PSI timeout in ms. The live path
  // keeps its fast 25s budget; batch runs pass a larger one because
  // slow-but-working sites must not read as "missing".
  psiTimeoutMs?: number;
  // Internal batch paths only: total PSI budget across all attempts in ms.
  // Must accompany a raised psiTimeoutMs — per-request timeouts alone allow
  // up to 4x timeoutMs of sequential work and can blow the edge budget.
  psiDeadlineMs?: number;
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
    // Set when the response is an unchanged same-day audit (see
    // freshAuditPayload) rather than a fresh measurement.
    servedFresh?: boolean;
    measuredAt?: string;
  };
}

// One firm can re-measure itself at most once per day: the external signals
// behind the score (PageSpeed, backlinks, press, directory standings) don't
// move hourly, and every run spends paid provider budget (PSI / DataForSEO /
// Gemini). A fresh existing audit is served back unchanged instead — free.
// Internal batch paths (skipRateLimit: census, targeted refreshes) bypass;
// the census itself is cadence-gated quarterly in run-census-audits.mjs.
export const AUDIT_REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface ExistingAuditRow {
  id: string;
  is_public: boolean;
  total_score: number;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  provenance: Record<string, string> | null;
  raw_metrics: Record<string, unknown> | null;
  updated_at: string;
}

// Pure decision, split out for the Deno test gate: given the firm's existing
// row (or none), return the serveable fresh-audit payload, or null to run.
export function freshAuditPayload(
  existing: ExistingAuditRow | null,
  now: Date,
  cooldownMs: number = AUDIT_REFRESH_COOLDOWN_MS,
): NonNullable<RunVisibilityAuditResult["payload"]> | null {
  if (!existing) return null;
  const ageMs = now.getTime() - new Date(existing.updated_at).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= cooldownMs) return null;
  const prov = existing.provenance ?? {};
  return {
    id: existing.id,
    isPublic: existing.is_public,
    totalScore: existing.total_score,
    categories: {
      performance: { score: existing.performance_score, provenance: prov.performance ?? "missing" },
      social: { score: existing.social_score, provenance: prov.social ?? "missing" },
      seoAuthority: { score: existing.seo_authority_score, provenance: prov.seoAuthority ?? "missing" },
      thoughtLeadership: { score: existing.thought_leadership_score, provenance: prov.thoughtLeadership ?? "missing" },
      reputation: { score: existing.reputation_score, provenance: prov.reputation ?? "missing" },
    },
    rawMetrics: existing.raw_metrics ?? {},
    // Filled by the caller — the peer query is a cheap DB read, not spend.
    percentile: null,
    peerCount: 0,
    servedFresh: true,
    measuredAt: existing.updated_at,
  };
}

export async function computePercentile(
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
  params: RunVisibilityAuditParams,
): Promise<RunVisibilityAuditResult> {
  const { clientId, auditedDomain, market, peerGroup } = params;
  const refinement = parsePeerRefinement(params as PeerRefinementInput);
  // Caps how often a single client can trigger the PSI/Gemini-backed audit —
  // applies to scheduled re-runs too, so a bug in the scheduler can't turn
  // into runaway spend.
  // skipRateLimit exists only for the secret-guarded census batch path —
  // visibility-audit-run's HTTP handler never forwards a caller-supplied
  // value into it (see RunVisibilityAuditParams).
  // Refresh reservation lives in its own expiring lease (audit_refresh_leases
  // + claim_audit_refresh RPC), NOT in updated_at: a BEFORE UPDATE trigger
  // forces updated_at = now() on the audits table, so the old bump-then-
  // rollback claim could never hand the timestamp back — a crashed or failed
  // run left the firm locked out for the full 24h cooldown and the due-rerun
  // scheduler skipped it. The lease TTL (~15 min, set in the RPC) means a
  // dead isolate self-heals quickly, and first-ever audits (no audit row yet)
  // are covered by the exact same atomic reservation.
  let holdsLease = false;
  const releaseLease = async () => {
    if (!holdsLease) return;
    holdsLease = false;
    const { error } = await serviceClient.rpc("release_audit_refresh", {
      p_client_id: clientId,
      p_audited_domain: auditedDomain,
      p_market: market,
    });
    if (error) console.error("runVisibilityAudit lease release failed (self-heals at TTL):", error);
  };
  if (params.skipRateLimit !== true) {
    const { data: claimStatus, error: claimError } = await serviceClient.rpc("claim_audit_refresh", {
      p_client_id: clientId,
      p_audited_domain: auditedDomain,
      p_market: market,
    });
    if (claimError) {
      // Fail closed: never start paid provider work without a reservation.
      console.error("runVisibilityAudit claim_audit_refresh error:", claimError);
      return { ok: false, status: 500, error: "Couldn't reserve the audit refresh. Try again shortly." };
    }
    if (claimStatus === "serve_fresh") {
      const { data: existingRow } = await serviceClient
        .from("market_visibility_audits")
        .select("id, is_public, total_score, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, provenance, raw_metrics, updated_at")
        .eq("client_id", clientId)
        .eq("audited_domain", auditedDomain)
        .eq("market", market)
        .maybeSingle();
      const fresh = freshAuditPayload((existingRow as ExistingAuditRow | null) ?? null, new Date());
      if (fresh) {
        const p = await computePercentile(serviceClient, market, peerGroup, fresh.totalScore);
        return { ok: true, status: 200, payload: { ...fresh, percentile: p?.percentile ?? null, peerCount: p?.peerCount ?? 0 } };
      }
      // Row vanished or aged out between the RPC and this read — rare race.
      // No lease is held, so tell the caller to retry rather than measuring
      // without a reservation.
      return { ok: false, status: 409, error: "An audit for this firm just changed. Try again shortly." };
    }
    if (claimStatus !== "claimed") {
      // 'held': another run — possibly a parallel first-ever request for the
      // same new domain — holds the lease right now.
      return { ok: false, status: 409, error: "An audit for this firm is already in progress. Try again in a few minutes." };
    }
    holdsLease = true;
    // Per-client daily cap still bounds total spend across domains.
    if (params.skipClientRateLimit !== true) {
      const { allowed } = await checkBenchmarkRateLimit(serviceClient, clientId);
      if (!allowed) {
        await releaseLease();
        return { ok: false, status: 429, error: "Daily audit limit reached for this client." };
      }
    }
  }

  try {
    return await measureAndPersist(serviceClient, params, refinement);
  } finally {
    // Success or failure, the lease is released: on success the fresh
    // updated_at (last SUCCESSFUL measurement, set by the row trigger) takes
    // over as the cooldown guard; on failure the firm can retry immediately.
    await releaseLease();
  }
}

async function measureAndPersist(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  params: RunVisibilityAuditParams,
  refinement: ReturnType<typeof parsePeerRefinement>,
): Promise<RunVisibilityAuditResult> {
  const { clientId, auditedDomain, displayName, market, peerGroup, gbpListed, social: socialRaw } = params;

  const normalizedUrl = normalizeUrl(auditedDomain);

  // parseSocialIntake returns null for blank/platform-only submissions so
  // they fall through to directory research instead of reading as zeros.
  const socialInput: SocialInput | null = parseSocialIntake(socialRaw);

  const [performance, reputation, thoughtLeadership, social, seoAuthority, siteHealth] = await Promise.all([
    computePerformanceScore(normalizedUrl, { timeoutMs: params.psiTimeoutMs, deadlineMs: params.psiDeadlineMs }),
    computeReputationScore(serviceClient, market, auditedDomain, gbpListed === true),
    computeThoughtLeadershipScore(serviceClient, market, peerGroup, normalizedUrl, displayName, auditedDomain, refinement.firmSize),
    // Social data ladder: intake numerics win (self-reported); then
    // researcher-verified directory numerics (LinkedIn census ingest) with
    // detected platform presence merged in; then homepage presence detection
    // alone (presence-only, labeled "detected"); then missing. The category
    // is measured whenever any real signal exists — never silently missing.
    (async () => {
      if (socialInput) {
        return computeSocialScore(serviceClient, market, peerGroup, socialInput, auditedDomain, refinement.firmSize, "self_reported");
      }
      const [directoryLinkedIn, detected] = await Promise.all([
        lookupDirectoryLinkedIn(serviceClient, market, auditedDomain),
        detectSocialPlatforms(normalizedUrl),
      ]);
      if (directoryLinkedIn) {
        return computeSocialScore(
          serviceClient, market, peerGroup,
          {
            followers: directoryLinkedIn.followers,
            posts30d: directoryLinkedIn.posts30d,
            platforms: {
              linkedin: true,
              instagram: detected?.instagram === true,
              twitter: detected?.twitter === true,
              facebook: detected?.facebook === true,
            },
          },
          auditedDomain, refinement.firmSize, "directory",
        );
      }
      if (!detected) return computeSocialScore(serviceClient, market, peerGroup, null, auditedDomain, refinement.firmSize);
      return computeSocialScore(serviceClient, market, peerGroup, { followers: 0, posts30d: 0, platforms: detected }, auditedDomain, refinement.firmSize, "detected");
    })(),
    computeSeoAuthorityScore(serviceClient, market, peerGroup, auditedDomain, refinement.firmSize),
    checkSiteHealth(normalizedUrl),
  ]);

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

  // Data-integrity metadata (CLAUDE.md §3): which methodology version scored
  // this, the data window it drew from, and an audit-level confidence
  // rolled up from every peer-normalized metric's own sample size — the
  // weakest-link metric determines how much a managing partner should trust
  // the number as precise versus directional.
  const reputationRaw = reputation.raw as {
    chambers?: { qualityStats?: PeerStats | null };
    legal500?: { qualityStats?: PeerStats | null };
    iflr1000?: { qualityStats?: PeerStats | null };
  };
  const { sampleSize, confidenceScore } = computeAuditConfidence([
    social.raw.followersStats, social.raw.postsStats, social.raw.erStats,
    thoughtLeadership.raw.postsStats, thoughtLeadership.raw.newsStats,
    reputationRaw.chambers?.qualityStats, reputationRaw.legal500?.qualityStats, reputationRaw.iflr1000?.qualityStats,
  ]);
  const now = new Date();
  const windowDays = DMV_MARKETS[market]?.contentWindowDays ?? 60;
  const dataWindow = computeDataWindow(now, windowDays);

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
      // updated_at means "last SUCCESSFUL measurement" — the row's BEFORE
      // UPDATE trigger forces it to now() anyway; setting it here keeps the
      // insert path of the upsert consistent. The refresh reservation lives
      // in audit_refresh_leases, never in this column.
      updated_at: now.toISOString(),
      methodology_version: METHODOLOGY_VERSION,
      data_window_start: dataWindow.start,
      data_window_end: dataWindow.end,
      sample_size: sampleSize,
      confidence_score: confidenceScore,
      firm_size: refinement.firmSize,
      office_count: refinement.officeCount,
      service_model: refinement.serviceModel,
      specialization: refinement.specialization,
      market_tier: refinement.marketTier,
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
  // Never updated once inserted — historical scores stay exactly as scored,
  // tagged with the methodology version that actually produced them, per
  // CLAUDE.md §3: a later methodology change scores forward, never rewrites
  // a past result.
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
      methodology_version: METHODOLOGY_VERSION,
      data_window_start: dataWindow.start,
      data_window_end: dataWindow.end,
      sample_size: sampleSize,
      confidence_score: confidenceScore,
      raw_metrics,
      provenance,
      source: "run",
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
