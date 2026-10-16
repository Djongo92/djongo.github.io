/**
 * Network Insights gating + payload types, extracted from the card
 * component so the visibility rules are unit-testable without React
 * Native rendering (same seam pattern as lib/auditData.ts).
 *
 * Payload shapes match the web component / edge response verbatim so the
 * two ports can't drift on field names.
 */

export interface NetworkInsight {
  key: string;
  title: string;
  stat: string;
  detail: string;
  sampleSize: number;
  confidence: 'emerging' | 'solid';
}

export interface InsightsResponse {
  gated?: boolean;
  insights?: NetworkInsight[];
  cohortSize?: number | null; // null below the privacy floor — never show the exact number
}

/** Audits needed before peer insights unlock — matches the edge function's MIN_OWN_AUDITS. */
export const MIN_OWN_AUDITS = 2;

export interface NetworkInsightsGate {
  /** Section renders at all. Gated on auth identity — a signed-in account
   *  with zero audits still browses demo display data but must see the
   *  locked state, so this must NOT key off isDemo. */
  visible: boolean;
  /** 2+ own audits: show insight cards (or skeleton/empty) instead of the lock. */
  unlocked: boolean;
  /** Only fetch when signed in AND unlocked — the edge function refuses
   *  under-2-audit accounts anyway; don't waste the round trip. */
  shouldFetch: boolean;
}

export function networkInsightsGate(
  accessToken: string | null | undefined,
  auditCount: number,
): NetworkInsightsGate {
  const signedIn = Boolean(accessToken);
  const unlocked = auditCount >= MIN_OWN_AUDITS;
  return {
    visible: signedIn,
    unlocked,
    shouldFetch: signedIn && unlocked,
  };
}

// ─── Fetch seam ───────────────────────────────────────────────────────────────

/** Injectable edge-call shape (matches lib/supabase's callFunction). */
export type InsightsFetcher = (
  name: 'network-insights',
  opts: { accessToken: string },
) => Promise<InsightsResponse | null>;

export interface LoadedInsights {
  insights: NetworkInsight[];
  cohortSize: number;
}

/**
 * Resolve the edge payload into card data, or null when there is nothing
 * honest to render yet:
 *   - a thrown/failed call → null (card keeps its skeleton; non-blocking,
 *     matching web's silent-failure treatment)
 *   - a null body → null
 *   - a gated response → null (server disagrees with our local unlock; do
 *     not fabricate an empty state)
 *   - otherwise → insights array (defaulting []) + cohortSize (defaulting 0,
 *     since null means "below the privacy floor — never show the number").
 */
export async function loadNetworkInsights(
  accessToken: string,
  callFn: InsightsFetcher,
): Promise<LoadedInsights | null> {
  let data: InsightsResponse | null;
  try {
    data = await callFn('network-insights', { accessToken });
  } catch (e) {
    console.debug('NetworkInsights fetch failed (non-blocking):', e);
    return null;
  }
  if (!data || data.gated) return null;
  return {
    insights: Array.isArray(data.insights) ? data.insights : [],
    cohortSize: typeof data.cohortSize === 'number' ? data.cohortSize : 0,
  };
}

// ─── View-state resolution ────────────────────────────────────────────────────

export type InsightsViewState =
  | 'hidden' // signed out — section renders nothing
  | 'locked' // signed in, <2 audits — explain what unlocks it
  | 'loading' // unlocked, fetch pending or silently failed — skeletons
  | 'empty' // fetch resolved with zero insights — privacy-floor copy
  | 'populated'; // insight cards

export function networkInsightsViewState(
  gate: NetworkInsightsGate,
  loaded: LoadedInsights | null,
): InsightsViewState {
  if (!gate.visible) return 'hidden';
  if (!gate.unlocked) return 'locked';
  if (loaded === null) return 'loading';
  return loaded.insights.length === 0 ? 'empty' : 'populated';
}

/** "Based on N anonymised firm(s) · early signal" — kept here so the copy is testable. */
export function insightSampleLine(insight: Pick<NetworkInsight, 'sampleSize' | 'confidence'>): string {
  return (
    `Based on ${insight.sampleSize} anonymised firm${insight.sampleSize === 1 ? '' : 's'}` +
    (insight.confidence === 'emerging' ? ' · early signal' : '')
  );
}
