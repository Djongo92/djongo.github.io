// Task #165 — pure movement logic for the weekly score digest, extracted so
// vitest can pin it without booting the edge function (same pattern as
// _shared/siteCopyInput.ts). No Deno or network imports allowed here.

export interface HistoryPoint {
  client_id: string;
  audited_domain: string;
  market: string;
  total_score: number;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  recorded_at: string;
  /** Readings from different methodology versions aren't comparable. */
  methodology_version?: number | null;
}

export interface DigestMovement {
  clientId: string;
  domain: string;
  market: string;
  from: number;
  to: number;
  delta: number;
  driver: string;
  /** recorded_at of the latest reading — the idempotency key: the same
   *  latest audit must never produce a second digest (code review, #165). */
  latestRecordedAt: string;
}

/** Below this week-over-week movement (of 500) the digest stays silent — noise is worse than no email. */
export const DIGEST_MIN_DELTA = 5;

/** The baseline must be at least this old, or the "weekly" delta is really same-week jitter. */
const BASELINE_AGE_MS = 6 * 864e5;

const CATEGORIES: [keyof HistoryPoint, string][] = [
  ["performance_score", "Website experience"],
  ["social_score", "Social presence"],
  ["seo_authority_score", "Search authority"],
  ["thought_leadership_score", "Thought leadership"],
  ["reputation_score", "Recognition"],
];

/**
 * One digest movement per client: for each (client, domain, market) group,
 * compare the latest reading against the newest reading from at least ~6
 * days earlier; keep movements at or above DIGEST_MIN_DELTA, then keep only
 * each client's largest mover (one notification per firm, not per domain).
 */
export function computeDigestMovements(rows: HistoryPoint[], now: Date): DigestMovement[] {
  const groups = new Map<string, HistoryPoint[]>();
  for (const r of rows) {
    const key = `${r.client_id}::${r.audited_domain}::${r.market}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const byClient = new Map<string, DigestMovement>();
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const latest = sorted[sorted.length - 1];
    const baseline = [...sorted]
      .reverse()
      .find((r) =>
        now.getTime() - new Date(r.recorded_at).getTime() >= BASELINE_AGE_MS
        && (r.methodology_version ?? null) === (latest.methodology_version ?? null));
    if (!baseline || baseline === latest) continue;

    const from = Math.round(baseline.total_score);
    const to = Math.round(latest.total_score);
    const delta = to - from;
    if (Math.abs(delta) < DIGEST_MIN_DELTA) continue;

    let driver = "";
    let best = 0;
    for (const [col, label] of CATEGORIES) {
      const d = Math.abs(Number(latest[col]) - Number(baseline[col]));
      if (d > best) {
        best = d;
        driver = label;
      }
    }

    const movement: DigestMovement = {
      clientId: latest.client_id,
      domain: latest.audited_domain,
      market: latest.market,
      from,
      to,
      delta,
      driver,
      latestRecordedAt: latest.recorded_at,
    };
    const existing = byClient.get(movement.clientId);
    if (!existing || Math.abs(movement.delta) > Math.abs(existing.delta)) {
      byClient.set(movement.clientId, movement);
    }
  }
  return [...byClient.values()];
}

/** Notification copy — this text doubles as the email body once a provider is wired up. */
export function digestNotification(m: DigestMovement): { title: string; body: string } {
  const arrow = m.delta > 0 ? "↑" : "↓";
  return {
    title: m.delta > 0 ? "Your visibility score went up this week" : "Your visibility score dipped this week",
    body: `${arrow} ${m.from} → ${m.to} of 500 for ${m.domain} (${m.market}). Biggest mover: ${m.driver}. Open the dashboard for the full picture.`,
  };
}
