// Honest score tie-back for a campaign window — see the campaigns
// migration's comment for why this is framed as correlation, not
// causation. Thought Leadership and Social are the two categories built on
// time-stamped, independently-measured signals (real scraping + Google
// News RSS for Thought Leadership; at minimum numeric and dated for
// Social) — the other three categories either don't move on a campaign's
// timescale (Reputation, SEO & Authority) or aren't something a single
// campaign's content output would plausibly explain (Performance), so this
// deliberately only ever surfaces those two, never a vague "total score
// went up" claim that invites a causal reading it can't support.
import type { HistoryRow } from "@/components/dashboard/CommandCenter";
import type { Campaign } from "@/hooks/useCampaigns";

export interface CampaignDelta {
  thoughtLeadershipDelta: number;
  socialDelta: number;
  windowStart: string;
  windowEnd: string;
}

/** Latest row at or before `at`; falls back to the earliest row if nothing qualifies. */
function closestRowAtOrBefore(rows: HistoryRow[], at: number): HistoryRow | null {
  if (rows.length === 0) return null;
  let best: HistoryRow | null = null;
  for (const row of rows) {
    const t = new Date(row.recorded_at).getTime();
    if (t <= at && (!best || t > new Date(best.recorded_at).getTime())) best = row;
  }
  return best ?? rows[0];
}

export function computeCampaignDelta(history: HistoryRow[], campaign: Campaign): CampaignDelta | null {
  if (!campaign.started_at) return null;

  const rows = history
    .filter((h) => h.audited_domain === campaign.audited_domain && h.market === campaign.market)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  if (rows.length < 2) return null;

  const startMs = new Date(campaign.started_at).getTime();
  const endMs = campaign.ended_at ? new Date(campaign.ended_at).getTime() : Date.now();

  const baseline = closestRowAtOrBefore(rows, startMs);
  const current = closestRowAtOrBefore(rows, endMs);
  if (!baseline || !current || baseline === current) return null;

  return {
    thoughtLeadershipDelta: Math.round((Number(current.thought_leadership_score) - Number(baseline.thought_leadership_score)) * 10) / 10,
    socialDelta: Math.round((Number(current.social_score) - Number(baseline.social_score)) * 10) / 10,
    windowStart: baseline.recorded_at,
    windowEnd: current.recorded_at,
  };
}
