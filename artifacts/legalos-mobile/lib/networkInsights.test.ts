import { describe, expect, it } from 'vitest';
import {
  networkInsightsGate,
  networkInsightsViewState,
  loadNetworkInsights,
  insightSampleLine,
  type NetworkInsight,
  type InsightsResponse,
} from './networkInsights';

const INSIGHT: NetworkInsight = {
  key: 'seo-momentum',
  title: 'SEO momentum',
  stat: '+12%',
  detail: 'Firms like yours grew SEO authority this quarter.',
  sampleSize: 8,
  confidence: 'solid',
};

const fetcher = (response: InsightsResponse | null) =>
  async () => response;

describe('networkInsightsGate', () => {
  it('hides the section entirely for signed-out (demo) browsing', () => {
    expect(networkInsightsGate(null, 0)).toEqual({
      visible: false, unlocked: false, shouldFetch: false,
    });
    // Even with (impossible) audit history, no token means no section.
    expect(networkInsightsGate(undefined, 5).visible).toBe(false);
  });

  it('shows the locked state for a signed-in account with zero audits', () => {
    // Regression guard: a brand-new signed-in account still browses demo
    // display data (DataContext keeps isDemo true), but the section must
    // render its locked state — gate on auth identity, never on isDemo.
    expect(networkInsightsGate('jwt', 0)).toEqual({
      visible: true, unlocked: false, shouldFetch: false,
    });
  });

  it('shows the locked state at one audit and never fetches', () => {
    expect(networkInsightsGate('jwt', 1)).toEqual({
      visible: true, unlocked: false, shouldFetch: false,
    });
  });

  it('unlocks and fetches at two or more audits when signed in', () => {
    expect(networkInsightsGate('jwt', 2)).toEqual({
      visible: true, unlocked: true, shouldFetch: true,
    });
    expect(networkInsightsGate('jwt', 7).shouldFetch).toBe(true);
  });
});

// ─── loadNetworkInsights — the injectable fetch seam ─────────────────────────

describe('loadNetworkInsights', () => {
  it('a throwing edge call resolves to null — non-blocking, skeleton stays', async () => {
    const result = await loadNetworkInsights('jwt', async () => {
      throw new Error('HTTP 500 from network-insights');
    });
    expect(result).toBeNull();
  });

  it('a null body resolves to null', async () => {
    expect(await loadNetworkInsights('jwt', fetcher(null))).toBeNull();
  });

  it('a gated response resolves to null — never fabricate an empty state', async () => {
    expect(await loadNetworkInsights('jwt', fetcher({ gated: true, insights: [INSIGHT] }))).toBeNull();
  });

  it('missing insights default to [], null cohortSize (privacy floor) defaults to 0', async () => {
    expect(await loadNetworkInsights('jwt', fetcher({}))).toEqual({ insights: [], cohortSize: 0 });
    expect(await loadNetworkInsights('jwt', fetcher({ insights: [], cohortSize: null }))).toEqual({
      insights: [],
      cohortSize: 0,
    });
  });

  it('passes populated insights through verbatim — payload-shape parity with web', async () => {
    const result = await loadNetworkInsights('jwt', fetcher({ insights: [INSIGHT], cohortSize: 11 }));
    expect(result).toEqual({ insights: [INSIGHT], cohortSize: 11 });
    // The renderable fields the card consumes must all survive the trip.
    expect(result?.insights[0]).toMatchObject({
      title: 'SEO momentum',
      stat: '+12%',
      detail: 'Firms like yours grew SEO authority this quarter.',
      sampleSize: 8,
    });
  });

  it('sends the access token to the edge call', async () => {
    let seen: string | undefined;
    await loadNetworkInsights('the-session-jwt', async (_name, opts) => {
      seen = opts.accessToken;
      return {};
    });
    expect(seen).toBe('the-session-jwt');
  });
});

// ─── networkInsightsViewState — one state per card branch ────────────────────

describe('networkInsightsViewState', () => {
  const gate = (token: string | null, audits: number) => networkInsightsGate(token, audits);

  it('signed out hides the section regardless of loaded data', () => {
    expect(networkInsightsViewState(gate(null, 0), null)).toBe('hidden');
    expect(networkInsightsViewState(gate(null, 5), { insights: [INSIGHT], cohortSize: 5 })).toBe('hidden');
  });

  it('signed in with <2 audits shows the locked state', () => {
    expect(networkInsightsViewState(gate('jwt', 0), null)).toBe('locked');
    expect(networkInsightsViewState(gate('jwt', 1), null)).toBe('locked');
  });

  it('unlocked with no resolved payload (pending, failed, or gated) keeps skeletons', () => {
    expect(networkInsightsViewState(gate('jwt', 2), null)).toBe('loading');
  });

  it('an empty insights array shows the privacy-floor copy', () => {
    expect(networkInsightsViewState(gate('jwt', 2), { insights: [], cohortSize: 0 })).toBe('empty');
    expect(networkInsightsViewState(gate('jwt', 3), { insights: [], cohortSize: 2 })).toBe('empty');
  });

  it('populated insights render the cards', () => {
    expect(networkInsightsViewState(gate('jwt', 2), { insights: [INSIGHT], cohortSize: 9 })).toBe('populated');
  });
});

// ─── insightSampleLine — the copy under each card ────────────────────────────

describe('insightSampleLine', () => {
  it('pluralises firms and flags emerging confidence', () => {
    expect(insightSampleLine({ sampleSize: 8, confidence: 'solid' })).toBe('Based on 8 anonymised firms');
    expect(insightSampleLine({ sampleSize: 1, confidence: 'solid' })).toBe('Based on 1 anonymised firm');
    expect(insightSampleLine({ sampleSize: 4, confidence: 'emerging' })).toBe(
      'Based on 4 anonymised firms · early signal',
    );
  });
});
