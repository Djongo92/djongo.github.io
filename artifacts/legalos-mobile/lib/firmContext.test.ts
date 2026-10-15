// The whole point of the structured firm context: the workshop edge
// functions interpolate `firmContext.practiceArea/.firmSize/.primaryGoal`
// directly into their prompts. Mobile used to send a display string — truthy,
// so every prompt carried "Firm context: undefined practice, undefined,
// primary goal: undefined." These tests mirror the exact template lines from
// one streaming function (workshop-bio-rewrite) and one JSON function
// (workshop-headlines) and assert the object mobile now sends renders real
// values, never the word "undefined".
import { describe, it, expect } from 'vitest';
import {
  DEMO_FIRM_CONTEXT,
  FIRM_CONTEXT_SERVER_KEY,
  PRACTICE_AREAS,
  FIRM_SIZES,
  GOALS,
  MARKETS,
  buildFirmContextSetBody,
  notifyFirmContextSaved,
  onFirmContextSaved,
  parseFirmContext,
  type FirmContext,
} from './firmContext';
import { tools } from '@/data/tools';

// Mirrors _shared/firmContextLine.ts — the single formatter every AI edge
// function now uses (the web's ai-context-coverage guard bans direct
// interpolation, so there is exactly one prompt shape to mirror).
const firmLine = (firmContext: FirmContext | null) => {
  if (!firmContext) return '';
  const parts = [
    `${firmContext.practiceArea} practice`,
    firmContext.firmSize,
    firmContext.market && `primary market: ${firmContext.market}`,
    `primary goal: ${firmContext.primaryGoal}`,
  ].filter(Boolean);
  return `\nFirm context: ${parts.join(', ')}.`;
};

const getTool = (id: string) => {
  const tool = tools.find((t) => t.id === id);
  if (!tool?.requestBody) throw new Error(`tool ${id} missing`);
  return tool;
};

describe('workshop firmContext payload', () => {
  const realContext: FirmContext = {
    practiceArea: 'Employment & Labour',
    firmSize: '2-10 attorneys',
    primaryGoal: 'Become the go-to firm for startup employers',
    market: 'Poland',
  };

  it('bio-rewriter (streaming fn) sends the object and its prompt block renders real values', () => {
    const body = getTool('bio-rewriter').requestBody!({ bio: 'x', partnerName: 'Ana' }, realContext);
    expect(body.firmContext).toEqual(realContext);
    const block = firmLine(body.firmContext as FirmContext);
    expect(block).toBe(
      '\nFirm context: Employment & Labour practice, 2-10 attorneys, primary market: Poland, primary goal: Become the go-to firm for startup employers.',
    );
    expect(block).not.toContain('undefined');
  });

  it('headlines (JSON fn) sends the object and its prompt block renders the market (demo firm)', () => {
    const body = getTool('headlines').requestBody!({ brief: 'b' }, DEMO_FIRM_CONTEXT);
    expect(body.firmContext).toEqual(DEMO_FIRM_CONTEXT);
    const block = firmLine(body.firmContext as FirmContext);
    expect(block).toBe(
      '\nFirm context: Corporate / M&A practice, 11-50 attorneys, primary market: Poland, primary goal: Win more mid-market M&A mandates.',
    );
    expect(block).not.toContain('undefined');
  });

  it('pre-market profiles render a clean line with no market fragment', () => {
    const { market: _omitted, ...legacy } = realContext;
    const block = firmLine(legacy);
    expect(block).not.toContain('market');
    expect(block).toContain('Employment & Labour practice');
  });

  it('null context omits the block entirely instead of faking one', () => {
    const body = getTool('headlines').requestBody!({ brief: 'b' }, null);
    expect(body.firmContext).toBeNull();
    expect(firmLine(null)).toBe('');
  });

  it('every tool with an edge function forwards firmContext untouched', () => {
    for (const tool of tools) {
      if (!tool.requestBody) continue;
      const body = tool.requestBody({}, realContext);
      expect(body.firmContext, tool.id).toEqual(realContext);
    }
  });

  it('parseFirmContext rejects partial or non-string server values', () => {
    expect(parseFirmContext(undefined)).toBeNull();
    expect(parseFirmContext('a display string')).toBeNull();
    expect(parseFirmContext({ practiceArea: 'X', firmSize: '', primaryGoal: 'Y' })).toBeNull();
    expect(parseFirmContext({ practiceArea: 'X', firmSize: 'S', primaryGoal: 'Y', extra: 1 })).toEqual({
      practiceArea: 'X',
      firmSize: 'S',
      primaryGoal: 'Y',
    });
  });

  it('parseFirmContext passes a market through and tolerates pre-market profiles', () => {
    expect(
      parseFirmContext({ practiceArea: 'X', firmSize: 'S', primaryGoal: 'Y', market: 'Poland' })?.market,
    ).toBe('Poland');
    // Profiles saved before task #142 have no market — they must keep parsing.
    expect(parseFirmContext({ practiceArea: 'X', firmSize: 'S', primaryGoal: 'Y' })?.market).toBeUndefined();
    expect(
      parseFirmContext({ practiceArea: 'X', firmSize: 'S', primaryGoal: 'Y', market: '' })?.market,
    ).toBeUndefined();
  });
});

// The mobile firm-profile screen offers these lists; the web Settings page
// offers the same ones (PersonalizeOnboarding.tsx). If either side edits a
// list, a value saved on one surface would render unselected on the other.
describe('firm profile option lists', () => {
  it('mirror the web lists exactly', () => {
    expect(PRACTICE_AREAS).toEqual([
      'Corporate / M&A', 'Litigation', 'Family Law', 'Real Estate', 'IP & Tech',
      'Employment & Labor', 'Tax', 'Criminal Defense', 'Estate Planning', 'Other',
    ]);
    expect(FIRM_SIZES).toEqual([
      'Solo (1 attorney)', 'Small (2-10 attorneys)', 'Mid-size (11-50 attorneys)',
      'Large (51-200 attorneys)', 'Major (200+ attorneys)',
    ]);
    expect(GOALS).toEqual([
      'Win more high-value clients', 'Build firm-wide brand & visibility',
      'Generate qualified inbound leads', 'Position lawyers as thought leaders',
      'Modernize digital presence',
    ]);
    expect(MARKETS).toEqual([
      'Poland', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria',
      'Ukraine', 'The Baltics', 'Croatia & the Adriatics', 'Other CEE', 'International / beyond CEE',
    ]);
  });

  it('the demo context pins the exact values the web demo seeds (demoData.ts) — both surfaces must describe the same fictional firm', () => {
    expect(DEMO_FIRM_CONTEXT).toEqual({
      practiceArea: 'Corporate / M&A',
      firmSize: '11-50 attorneys',
      primaryGoal: 'Win more mid-market M&A mandates',
      market: 'Poland',
    });
  });
});

// A mobile save must land exactly where the web reads: server-state key
// `firm_context`, clientId + accessToken in the body (pushServerState shape).
describe('buildFirmContextSetBody', () => {
  it('writes the same firm_context key/value the web reads', () => {
    expect(buildFirmContextSetBody('user-1', 'token-1', DEMO_FIRM_CONTEXT)).toEqual({
      clientId: 'user-1',
      accessToken: 'token-1',
      key: 'firm_context',
      value: DEMO_FIRM_CONTEXT,
    });
    expect(FIRM_CONTEXT_SERVER_KEY).toBe('firm_context');
  });

  it('echoes the read-resolved firm so a multi-firm account saves to the firm it was shown', () => {
    expect(buildFirmContextSetBody('user-1', 'token-1', DEMO_FIRM_CONTEXT, 'firm-9').requestedFirmId).toBe('firm-9');
    expect(buildFirmContextSetBody('user-1', 'token-1', DEMO_FIRM_CONTEXT).requestedFirmId).toBeUndefined();
  });
});

// The save-notification contract between the firm-profile screen and every
// mounted useFirmContext: a save must reach subscribers, and unsubscribed
// listeners must not fire.
describe('firm context saved notifications', () => {
  it('notifyFirmContextSaved reaches subscribers until they unsubscribe', () => {
    const calls: number[] = [];
    const off = onFirmContextSaved(() => calls.push(1));
    notifyFirmContextSaved();
    off();
    notifyFirmContextSaved();
    expect(calls).toEqual([1]);
  });
});
