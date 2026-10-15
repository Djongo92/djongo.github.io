/**
 * Write side of the mobile Battle Plan: turns a finished Headline Lab /
 * Bio Rewriter run into the same user-state payloads the web writes
 * (useBattlePlanCache → user-state-set), so a mobile run arms the plan on
 * both surfaces. The tool screen owns the network push; this module owns
 * the payload shapes and the on-device fallback for demo/anonymous runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BattlePlanSlots } from './battlePlanModel';

// Mirror of the web's HeadlineWinnerCache (useBattlePlanCache.ts) — keep
// field-for-field compatible or the web plan reads a mobile run as broken.
export interface HeadlineWinnerPayload {
  text: string;
  angle: string;
  why: string;
  brief: string;
  capturedAt: number;
}

// Mirror of the web's BioCache. Mobile collects no role/emphases, so the
// array stays empty rather than inventing emphasis the user never picked.
export interface BioPayload {
  name?: string;
  emphases: string[];
  rewrite: string;
  capturedAt: number;
}

interface HeadlineCandidate {
  text?: unknown;
  angle?: unknown;
  score?: unknown;
  why?: unknown;
}

export function buildHeadlineSlot(data: unknown, brief: string): HeadlineWinnerPayload | null {
  const list = (data as { headlines?: unknown } | null)?.headlines;
  if (!Array.isArray(list) || list.length === 0) return null;
  // Mobile has no tournament bracket — the champion is the highest predicted
  // score, first on ties, matching the web's score-descending sort.
  let best: HeadlineCandidate | null = null;
  let bestScore = -Infinity;
  for (const item of list) {
    const h = item as HeadlineCandidate;
    if (typeof h?.text !== 'string' || !h.text.trim()) continue;
    const score = typeof h.score === 'number' ? h.score : 0;
    if (score > bestScore) {
      best = h;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    text: (best.text as string).trim(),
    angle: typeof best.angle === 'string' ? best.angle : '',
    why: typeof best.why === 'string' ? best.why : '',
    brief,
    capturedAt: Date.now(),
  };
}

export function buildBioSlot(data: unknown, partnerName?: string): BioPayload | null {
  // The bio endpoint streams markdown (de-framed by callEdgeFunction);
  // anything else isn't a rewrite we can stand behind.
  if (typeof data !== 'string' || !data.trim()) return null;
  const name = partnerName?.trim();
  return { ...(name ? { name } : {}), emphases: [], rewrite: data.trim(), capturedAt: Date.now() };
}

// Mobile can only produce headline/bio today — the on-device fallback covers
// exactly those slots, keyed apart from anything server-synced.
const LOCAL_KEYS = { headline: 'battleplan_local_headline', bio: 'battleplan_local_bio' } as const;
export type LocalSlotKey = keyof typeof LOCAL_KEYS;

// Serialize writes per slot: saveLocalSlot and clearLocalSlot run through a
// per-slot promise queue, so clear's read-compare-remove can never interleave
// with a newer save (found in code review — without this, a run saved between
// clear's compare and its removeItem was silently deleted). Reads stay
// unqueued; staleness on read is handled by the compare at write time.
const slotQueues: Record<LocalSlotKey, Promise<unknown>> = {
  headline: Promise.resolve(),
  bio: Promise.resolve(),
};

function enqueueSlot<T>(slot: LocalSlotKey, op: () => Promise<T>): Promise<T> {
  const run = slotQueues[slot].then(op, op);
  slotQueues[slot] = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Returns whether the save landed — the caller's honesty note depends on it. */
export async function saveLocalSlot(slot: LocalSlotKey, value: unknown): Promise<boolean> {
  try {
    await enqueueSlot(slot, () => AsyncStorage.setItem(LOCAL_KEYS[slot], JSON.stringify(value)));
    return true;
  } catch {
    // Disk full etc. — the run output is still on screen; don't mask that.
    return false;
  }
}

export async function readLocalSlots(): Promise<Partial<Pick<BattlePlanSlots, 'headline' | 'bio'>>> {
  const out: Partial<Pick<BattlePlanSlots, 'headline' | 'bio'>> = {};
  for (const slot of Object.keys(LOCAL_KEYS) as LocalSlotKey[]) {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEYS[slot]);
      if (raw) (out as Record<string, unknown>)[slot] = JSON.parse(raw);
    } catch {
      // A corrupt entry reads as absent, not as a crash.
    }
  }
  return out;
}

/** Best-effort clear after a successful server promotion (or when the server
 *  already holds the slot) — this is what makes the promotion pushed-once.
 *  `expectedValue` makes the clear conditional — only the exact value this
 *  load promoted may be removed — and the per-slot queue makes the
 *  read-compare-remove atomic against other writes, so a newer on-device
 *  run landing mid-clear survives (both found in code review). */
export async function clearLocalSlot(slot: LocalSlotKey, expectedValue?: unknown): Promise<void> {
  try {
    await enqueueSlot(slot, async () => {
      if (expectedValue !== undefined) {
        const raw = await AsyncStorage.getItem(LOCAL_KEYS[slot]);
        if (raw !== JSON.stringify(expectedValue)) return;
      }
      await AsyncStorage.removeItem(LOCAL_KEYS[slot]);
    });
  } catch {
    // A stuck copy only means a redundant retry next load — never worse.
  }
}
