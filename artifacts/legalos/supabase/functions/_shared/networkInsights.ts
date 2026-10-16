// Network Intelligence (task #122) — anonymised cross-firm benchmarks.
// Aggregation over market_visibility_audits + workshop run history across
// the firm's peer cohort, distilled into 2–3 recommendation-framed insight
// cards. PRIVACY: only aggregate statistics ever leave this module — no
// firm name, domain, or raw row is exposed — and no statistic is produced
// unless at least MIN_COHORT_FIRMS distinct firms contribute. The pure
// builders are separated from the queries for vitest coverage.

// deno-lint-ignore no-explicit-any
import { CATEGORY_MAX, TOTAL_MAX, carryForwardCategoryScore, round2, totalMaxForVersion } from "./methodology.ts";
type SupabaseClient = any;

/** No statistic is ever shown when fewer than this many distinct firms contribute. */
export const MIN_COHORT_FIRMS = 3;

/**
 * Minimum firms on EACH side of a comparison. The cohort floor alone is not
 * enough: with a 3-firm cohort, a subgroup of one would publish that single
 * firm's exact score delta and behavior. Every comparison group must have
 * at least this many firms before its average can be shown.
 */
export const MIN_SUBGROUP_FIRMS = 2;

/** A firm's request must have this many audits before insights unlock. */
export const MIN_OWN_AUDITS = 2;

/** Cache freshness window — the daily cron batches keep every firm within this. */
export const INSIGHTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * One cron invocation processes at most this many firms. A single edge
 * function call has a finite wall-clock budget, so the sweep is BATCHED
 * with a durable cursor (network_insights_cron_state): each daily run takes
 * the next batch after the cursor and wraps when exhausted. A firm is never
 * skipped permanently and a crash mid-batch loses nothing — the cursor only
 * advances past firms actually refreshed.
 */
export const CRON_BATCH_SIZE = 50;

export interface CronBatch {
  batch: string[];
  /** Cursor to persist after the batch completes; null wraps to the start. */
  nextCursor: string | null;
}

/** Pure batch selection over the deterministically-ordered eligible IDs. */
export function nextCronBatch(
  eligibleIds: string[],
  cursor: string | null,
  batchSize: number = CRON_BATCH_SIZE,
): CronBatch {
  // IDs come from the SQL RPC ordered by client_id; uuid string comparison
  // matches Postgres uuid ordering (fixed-width hex).
  const remaining = cursor ? eligibleIds.filter((id) => id > cursor) : eligibleIds;
  const batch = remaining.slice(0, batchSize);
  const exhausted = remaining.length <= batchSize;
  return { batch, nextCursor: exhausted ? null : batch[batch.length - 1] ?? null };
}

export interface CohortAuditPoint {
  totalScore: number;
  socialScore: number;   // current-methodology points (see toCohortPoint)
  thoughtScore: number;
  createdAt: string;
}

export interface CohortFirm {
  clientId: string;
  audits: CohortAuditPoint[]; // ascending by createdAt
  runCount90d: number;        // workshop runs in the last 90 days
}

export interface NetworkInsight {
  key: "workshop-momentum" | "category-standing" | "audit-cadence";
  title: string;   // recommendation framing: "Firms like yours that did X saw Y"
  stat: string;    // headline number, e.g. "+12 pts"
  detail: string;  // one supporting sentence
  sampleSize: number;
  confidence: "emerging" | "solid";
}

const confidenceFor = (n: number): "emerging" | "solid" => (n >= 8 ? "solid" : "emerging");

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Score delta between a firm's earliest and latest audit in the window. */
function delta(f: CohortFirm): number {
  if (f.audits.length < 2) return 0;
  return f.audits[f.audits.length - 1].totalScore - f.audits[0].totalScore;
}

/**
 * Builds up to 3 anonymised insights from a peer cohort. Pure. The caller
 * must have already enforced the cohort-size floor; this function enforces
 * it again so it can never be bypassed.
 */
export function buildNetworkInsights(cohort: CohortFirm[], ownClientId: string): NetworkInsight[] {
  const distinct = new Set(cohort.map((f) => f.clientId));
  if (distinct.size < MIN_COHORT_FIRMS) return [];

  const own = cohort.find((f) => f.clientId === ownClientId);
  const peers = cohort.filter((f) => f.clientId !== ownClientId); // comparisons exclude self
  const insights: NetworkInsight[] = [];

  // ── 1. Workshop momentum: active Workshop users vs the rest ────────────
  // PEER-ONLY: the requester's own numbers never contribute to any published
  // comparison — otherwise their known delta could be differenced back out.
  const tracked = peers.filter((f) => f.audits.length >= 2);
  const active = tracked.filter((f) => f.runCount90d >= 5);
  const quiet = tracked.filter((f) => f.runCount90d < 5);
  if (active.length >= MIN_SUBGROUP_FIRMS && quiet.length >= MIN_SUBGROUP_FIRMS) {
    const activeDelta = avg(active.map(delta));
    const quietDelta = avg(quiet.map(delta));
    if (activeDelta > quietDelta + 1) {
      insights.push({
        key: "workshop-momentum",
        title: "Firms like yours that work the Workshop weekly pull ahead",
        stat: `+${Math.round(activeDelta)} pts`,
        detail: `Peers running 5+ Workshop sessions in 90 days gained ${Math.round(activeDelta)} points on average between audits, versus ${Math.round(quietDelta)} for less active firms.`,
        sampleSize: tracked.length,
        confidence: confidenceFor(tracked.length),
      });
    }
  }

  // ── 2. Category standing: the firm's biggest gap vs peer average ───────
  // Requires a full peer-only group (the requester's own numbers are never
  // part of the average) so the mean can't be differenced against the
  // requester's known score to isolate one peer.
  if (own && peers.length >= MIN_COHORT_FIRMS) {
    const ownLatest = own.audits[own.audits.length - 1];
    const peerSocial = avg(peers.map((f) => f.audits[f.audits.length - 1].socialScore));
    const peerThought = avg(peers.map((f) => f.audits[f.audits.length - 1].thoughtScore));
    const socialGap = peerSocial - ownLatest.socialScore;
    const thoughtGap = peerThought - ownLatest.thoughtScore;
    // Normalize to % of category max so gaps are comparable across scales.
    const socialPct = socialGap / CATEGORY_MAX.social;
    const thoughtPct = thoughtGap / CATEGORY_MAX.thoughtLeadership;
    if (Math.max(socialPct, thoughtPct) > 0.05) {
      const isSocial = socialPct >= thoughtPct;
      insights.push({
        key: "category-standing",
        title: isSocial
          ? "Social presence is your widest gap against peers"
          : "Thought leadership is your widest gap against peers",
        stat: isSocial
          ? `${Math.round(peerSocial)} vs your ${Math.round(ownLatest.socialScore)}`
          : `${Math.round(peerThought)} vs your ${Math.round(ownLatest.thoughtScore)}`,
        detail: isSocial
          ? `Peer firms average ${Math.round(peerSocial)}/${CATEGORY_MAX.social} on Social presence — the biggest relative gap in your scorecard. Closing it is the fastest route up the leaderboard.`
          : `Peer firms average ${Math.round(peerThought)}/${CATEGORY_MAX.thoughtLeadership} on Thought Leadership — the biggest relative gap in your scorecard. Publishing consistently is how peers close it.`,
        sampleSize: peers.length,
        confidence: confidenceFor(peers.length),
      });
    }
  }

  // ── 3. Audit cadence: firms that re-audit regularly improve more ───────
  const frequent = tracked.filter((f) => f.audits.length >= 3);
  const occasional = tracked.filter((f) => f.audits.length === 2);
  if (frequent.length >= MIN_SUBGROUP_FIRMS && occasional.length >= MIN_SUBGROUP_FIRMS) {
    const freqDelta = avg(frequent.map(delta));
    const occDelta = avg(occasional.map(delta));
    if (freqDelta > occDelta + 1) {
      insights.push({
        key: "audit-cadence",
        title: "Firms that re-audit on a rhythm compound their gains",
        stat: `+${Math.round(freqDelta)} pts`,
        detail: `Peers with 3+ audits improved ${Math.round(freqDelta)} points on average across their history, versus ${Math.round(occDelta)} for firms measured twice. Measurement itself drives focus.`,
        sampleSize: tracked.length,
        confidence: confidenceFor(tracked.length),
      });
    }
  }

  return insights.slice(0, 3);
}

// ── Query layer ────────────────────────────────────────────────────────────
// IMPORTANT: market_visibility_audits is an UPSERTED current-state table
// (unique per client/domain/market) — it can never answer "how many audits"
// or "how did the score move". All history, counts, and deltas come from the
// append-only market_visibility_audit_history table; the current-state table
// is used ONLY for peer-scope dimensions (firm_size lives there, not in
// history).

/** A history row on the current methodology's scale — older readings are
 *  converted share-for-share so a cohort never mixes two point scales. */
function toCohortPoint(r: Record<string, unknown>): CohortAuditPoint {
  const v = r.methodology_version == null ? null : Number(r.methodology_version);
  const total = Number(r.total_score) || 0;
  return {
    totalScore: round2((total * TOTAL_MAX) / totalMaxForVersion(v)),
    socialScore: carryForwardCategoryScore(Number(r.social_score) || 0, "social", v),
    thoughtScore: carryForwardCategoryScore(Number(r.thought_leadership_score) || 0, "thoughtLeadership", v),
    createdAt: String(r.recorded_at),
  };
}

/** The firm's own audit history, ascending by recorded_at. */
export async function getOwnAudits(serviceClient: SupabaseClient, firmId: string): Promise<CohortAuditPoint[]> {
  const { data, error } = await serviceClient
    .from("market_visibility_audit_history")
    .select("total_score, social_score, thought_leadership_score, recorded_at, methodology_version")
    .eq("client_id", firmId)
    .order("recorded_at", { ascending: true });
  if (error) {
    console.error("network-insights own audits error:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => toCohortPoint(r));
}

export interface PeerScope {
  market: string;
  peerGroup: string;
  firmSize: string | null;
}

/** The firm's peer scope from its latest audit (market + tier + size). */
export async function getPeerScope(serviceClient: SupabaseClient, firmId: string): Promise<PeerScope | null> {
  const { data, error } = await serviceClient
    .from("market_visibility_audits")
    .select("market, peer_group, firm_size")
    .eq("client_id", firmId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    market: String(data.market),
    peerGroup: String(data.peer_group),
    firmSize: typeof data.firm_size === "string" ? data.firm_size : null,
  };
}

/**
 * Cohort assembly. firm_size lives only on the current-state table, so
 * membership is resolved there first (narrow size-matched scope, widened to
 * the whole peer group below the privacy floor — same fallback philosophy
 * as peerStats.ts); the audit SERIES then comes from the append-only
 * history table. Never returns rows; only grouped, per-firm aggregates.
 */
export async function getCohort(
  serviceClient: SupabaseClient,
  scope: PeerScope,
): Promise<CohortFirm[]> {
  const memberIds = async (narrow: boolean): Promise<Set<string> | null> => {
    let q = serviceClient
      .from("market_visibility_audits")
      .select("client_id")
      .eq("market", scope.market)
      .eq("peer_group", scope.peerGroup)
      .limit(2000);
    if (narrow && scope.firmSize) q = q.eq("firm_size", scope.firmSize);
    const { data, error } = await q;
    if (error) {
      console.error("network-insights cohort membership error:", error.message);
      return null;
    }
    return new Set((data ?? []).map((r: { client_id: string }) => String(r.client_id)));
  };

  let ids = await memberIds(true);
  if (!ids) return [];
  // Privacy floor: widen from size-matched to peer-group-wide if too thin.
  if (ids.size < MIN_COHORT_FIRMS && scope.firmSize) {
    ids = await memberIds(false);
    if (!ids) return [];
  }
  if (ids.size < MIN_COHORT_FIRMS) return [];

  const { data, error } = await serviceClient
    .from("market_visibility_audit_history")
    .select("client_id, total_score, social_score, thought_leadership_score, recorded_at, methodology_version")
    .in("client_id", [...ids])
    .order("recorded_at", { ascending: true })
    .limit(5000);
  if (error) {
    console.error("network-insights cohort history error:", error.message);
    return [];
  }

  const byFirm = new Map<string, CohortFirm>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const id = String(r.client_id);
    if (!byFirm.has(id)) byFirm.set(id, { clientId: id, audits: [], runCount90d: 0 });
    byFirm.get(id)!.audits.push(toCohortPoint(r));
  }

  // 90-day workshop run counts per firm (from synced run history).
  const firmIds = [...byFirm.keys()];
  if (firmIds.length) {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const { data: states, error: stateError } = await serviceClient
      .from("user_app_state")
      .select("client_id, value")
      .eq("key", "workshop_run_history")
      .in("client_id", firmIds);
    if (stateError) console.error("network-insights run history error:", stateError.message);
    for (const row of (states ?? []) as { client_id: string; value: unknown }[]) {
      const firm = byFirm.get(row.client_id);
      if (!firm || !Array.isArray(row.value)) continue;
      firm.runCount90d = (row.value as { createdAt?: number }[]).filter(
        (r) => typeof r?.createdAt === "number" && r.createdAt >= cutoff,
      ).length;
    }
  }

  return [...byFirm.values()];
}
