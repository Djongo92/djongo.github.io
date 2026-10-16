// Parity guard for the mobile port of the web Battle Plan model — the two
// surfaces read the same server state, so the shape rules (steps, totals,
// badges, staleness) must not drift. If the web model changes, change this
// file and lib/battlePlanModel.ts with it.
import { describe, it, expect } from 'vitest';
import {
  buildSteps,
  planTotals,
  earnedBadgeIds,
  hasAnyInput,
  isStale,
  timeAgo,
  STALE_AFTER_MS,
  EMPTY_SLOTS,
  SERVER_KEYS,
  type BattlePlanSlots,
} from './battlePlanModel';

const at = Date.now();
const filled = (over: Partial<BattlePlanSlots> = {}): BattlePlanSlots => ({
  ...EMPTY_SLOTS,
  ...over,
});

const roast = { grade: 'C', verdict: 'v', topThreeFixes: ['a'], capturedAt: at };
const competitor = { executiveSummary: 's', recommendedMoves: [], capturedAt: at };
const roadmap = { summary: 's', phases: [], capturedAt: at };
const maturity = { score: 60, dimensions: [], capturedAt: at };
const headline = { text: 'h', angle: 'a', capturedAt: at };
const bio = { rewrite: 'r', capturedAt: at };
const visibility = { totalScore: 100, percentile: 10, peerCount: 44, capturedAt: at };

describe('server keys', () => {
  it('matches the web app’s user-state keys exactly', () => {
    expect(SERVER_KEYS).toEqual({
      roast: 'battleplan_roast',
      competitor: 'battleplan_competitor',
      roadmap: 'battleplan_roadmap',
      maturity: 'battleplan_maturity',
      headline: 'battleplan_headline',
      bio: 'battleplan_bio',
      visibilityScore: 'battleplan_visibility',
    });
  });
});

describe('buildSteps / planTotals', () => {
  it('counts seven sections with three core', () => {
    const steps = buildSteps(EMPTY_SLOTS);
    expect(steps).toHaveLength(7);
    expect(planTotals(steps)).toEqual({ done: 0, total: 7, coreDone: 0, coreTotal: 3 });
    expect(hasAnyInput(EMPTY_SLOTS)).toBe(false);
  });

  it('marks filled slots done and carries capturedAt', () => {
    const slots = filled({ roast, roadmap, visibilityScore: visibility });
    const steps = buildSteps(slots);
    expect(planTotals(steps)).toEqual({ done: 3, total: 7, coreDone: 2, coreTotal: 3 });
    expect(steps.find((s) => s.key === 'roast')?.capturedAt).toBe(at);
    expect(hasAnyInput(slots)).toBe(true);
  });
});

describe('badges', () => {
  it('battle-ready needs all three core inputs', () => {
    expect(earnedBadgeIds(filled({ roast, competitor })).has('battle-ready')).toBe(false);
    expect(earnedBadgeIds(filled({ roast, competitor, roadmap })).has('battle-ready')).toBe(true);
  });

  it('foundation-builder needs visibility + maturity; voice-found needs headline + bio', () => {
    expect(earnedBadgeIds(filled({ visibilityScore: visibility })).has('foundation-builder')).toBe(false);
    expect(earnedBadgeIds(filled({ visibilityScore: visibility, maturity })).has('foundation-builder')).toBe(true);
    expect(earnedBadgeIds(filled({ headline })).has('voice-found')).toBe(false);
    expect(earnedBadgeIds(filled({ headline, bio })).has('voice-found')).toBe(true);
  });

  it('fully-armed needs every section', () => {
    const almost = filled({ roast, competitor, roadmap, maturity, headline, bio });
    expect(earnedBadgeIds(almost).has('fully-armed')).toBe(false);
    expect(earnedBadgeIds(filled({ ...almost, visibilityScore: visibility })).has('fully-armed')).toBe(true);
  });
});

describe('staleness', () => {
  it('flags inputs older than 30 days only', () => {
    const now = Date.now();
    expect(isStale(now - STALE_AFTER_MS - 1, now)).toBe(true);
    expect(isStale(now - STALE_AFTER_MS + 1, now)).toBe(false);
    expect(isStale(undefined, now)).toBe(false);
  });

  it('formats age coarsely', () => {
    const now = Date.now();
    expect(timeAgo(now - 5 * 60000, now)).toBe('5m ago');
    expect(timeAgo(now - 3 * 3600000, now)).toBe('3h ago');
    expect(timeAgo(now - 2 * 86400000, now)).toBe('2d ago');
  });
});
