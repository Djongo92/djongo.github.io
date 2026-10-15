// Payload builders + on-device fallback for the mobile Battle Plan write
// path. The builders must stay field-compatible with the web's
// HeadlineWinnerCache/BioCache (useBattlePlanCache.ts) — a mobile run that
// doesn't parse on the web is a broken sync, not a saved one.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        store.delete(k);
        return Promise.resolve();
      },
      clear: () => {
        store.clear();
        return Promise.resolve();
      },
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildBioSlot,
  buildHeadlineSlot,
  clearLocalSlot,
  readLocalSlots,
  saveLocalSlot,
} from './battlePlanWrite';

describe('buildHeadlineSlot', () => {
  const headlines = [
    { text: 'Weaker pick', angle: 'Fear', score: 6, why: 'generic' },
    { text: 'The champion line', angle: 'Proof', score: 9, why: 'specific and verifiable' },
    { text: 'Mid pick', angle: 'Speed', score: 7, why: 'fast' },
  ];

  it('crowns the highest-scored headline and keeps the web payload shape', () => {
    const slot = buildHeadlineSlot({ headlines }, 'homepage hero for an M&A boutique');
    expect(slot).toMatchObject({
      text: 'The champion line',
      angle: 'Proof',
      why: 'specific and verifiable',
      brief: 'homepage hero for an M&A boutique',
    });
    expect(typeof slot?.capturedAt).toBe('number');
  });

  it('breaks score ties in favour of the first entry', () => {
    const slot = buildHeadlineSlot({
      headlines: [
        { text: 'First', angle: 'A', score: 8 },
        { text: 'Second', angle: 'B', score: 8 },
      ],
    }, '');
    expect(slot?.text).toBe('First');
  });

  it('skips entries with no usable text even when they out-score the rest', () => {
    const slot = buildHeadlineSlot({
      headlines: [
        { text: '  ', angle: 'Empty', score: 10 },
        { text: 'Real one', angle: 'A', score: 5 },
      ],
    }, '');
    expect(slot?.text).toBe('Real one');
  });

  it('returns null when the response has no headline list', () => {
    expect(buildHeadlineSlot({}, '')).toBeNull();
    expect(buildHeadlineSlot({ headlines: [] }, '')).toBeNull();
    expect(buildHeadlineSlot('not an object', '')).toBeNull();
    expect(buildHeadlineSlot(null, '')).toBeNull();
  });
});

describe('buildBioSlot', () => {
  it('wraps the de-framed rewrite with a trimmed partner name', () => {
    const slot = buildBioSlot('## Short Version\n\nSharp bio.', '  Ana Petrović  ');
    expect(slot).toMatchObject({ name: 'Ana Petrović', emphases: [], rewrite: '## Short Version\n\nSharp bio.' });
  });

  it('omits the name entirely when none was given', () => {
    const slot = buildBioSlot('rewritten bio');
    expect(slot && 'name' in slot).toBe(false);
    expect(slot?.emphases).toEqual([]);
  });

  it('returns null for anything that is not a non-empty rewrite', () => {
    expect(buildBioSlot('')).toBeNull();
    expect(buildBioSlot('   ')).toBeNull();
    expect(buildBioSlot({ rewritten: 'json shape' })).toBeNull();
    expect(buildBioSlot(null)).toBeNull();
  });
});

describe('on-device slot fallback', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips a saved slot through readLocalSlots', async () => {
    expect(await saveLocalSlot('headline', { text: 'saved line', angle: 'A', capturedAt: 123 })).toBe(true);
    expect(await saveLocalSlot('bio', { emphases: [], rewrite: 'saved bio', capturedAt: 456 })).toBe(true);
    const local = await readLocalSlots();
    expect(local.headline).toMatchObject({ text: 'saved line' });
    expect(local.bio).toMatchObject({ rewrite: 'saved bio' });
  });

  it('reads a corrupt entry as absent instead of throwing', async () => {
    await AsyncStorage.setItem('battleplan_local_headline', '{not json');
    const local = await readLocalSlots();
    expect(local.headline).toBeUndefined();
    expect(local.bio).toBeUndefined();
  });
});

describe('clearLocalSlot', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes the entry when the stored value still matches the promoted one', async () => {
    const value = { text: 'the run', angle: 'A', capturedAt: 1 };
    await saveLocalSlot('headline', value);
    await clearLocalSlot('headline', value);
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('keeps the entry when a newer on-device run replaced it mid-clear', async () => {
    // The window this guards: a stale load decided to clear, then the device
    // owner (signed out, or another account) ran the tool again before the
    // removal landed. The newer run must survive.
    await saveLocalSlot('bio', { emphases: [], rewrite: 'old run', capturedAt: 1 });
    await saveLocalSlot('bio', { emphases: [], rewrite: 'new run', capturedAt: 2 });
    await clearLocalSlot('bio', { emphases: [], rewrite: 'old run', capturedAt: 1 });
    expect(await AsyncStorage.getItem('battleplan_local_bio')).toBe(
      JSON.stringify({ emphases: [], rewrite: 'new run', capturedAt: 2 }),
    );
  });

  it('treats an already-absent entry as nothing to do', async () => {
    await clearLocalSlot('headline', { text: 'ghost', capturedAt: 1 });
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('serializes a clear against a save that starts while the clear is in flight', async () => {
    // The interleaving the per-slot queue exists for: the clear's
    // read-compare-remove is one queued unit, so the save queued behind it
    // lands after — and must survive.
    await saveLocalSlot('bio', { emphases: [], rewrite: 'old run', capturedAt: 1 });
    const clearing = clearLocalSlot('bio', { emphases: [], rewrite: 'old run', capturedAt: 1 });
    await saveLocalSlot('bio', { emphases: [], rewrite: 'new run', capturedAt: 2 });
    await clearing;
    expect(await AsyncStorage.getItem('battleplan_local_bio')).toBe(
      JSON.stringify({ emphases: [], rewrite: 'new run', capturedAt: 2 }),
    );
  });
});
