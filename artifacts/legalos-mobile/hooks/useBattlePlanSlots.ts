/**
 * Reads the seven Battle Plan slots for the signed-in account from the same
 * server-side user-state the web app writes (useBattlePlanCache →
 * user-state-get). Mobile never invents a parallel store: what you ran on the
 * web shows up here, and mobile Headline Lab / Bio Rewriter runs push back
 * through the same user-state keys (see lib/battlePlanWrite.ts). In demo mode
 * it serves a partial demo plan, mirroring the score-history screen's
 * simulated trend — with any demo/anonymous tool runs stored on-device
 * merged over it, so a local run visibly arms its section. On sign-in those
 * on-device runs are promoted into the account wherever the server has no
 * value yet (never overwriting it), mirroring the web's local→server push.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { callEdgeFunction } from '@/lib/api';
import { clearLocalSlot, readLocalSlots } from '@/lib/battlePlanWrite';
import {
  EMPTY_SLOTS,
  SERVER_KEYS,
  type BattlePlanSlots,
  type StepKey,
} from '@/lib/battlePlanModel';

const DAY = 24 * 60 * 60 * 1000;

// A deliberately *partial* plan (4 of 7) — a full one would hide the
// empty-section cards, which are half the point of the screen.
const demoSlots = (): BattlePlanSlots => ({
  roast: {
    grade: 'C+',
    verdict: 'Competent, credible, and completely interchangeable with every other firm in your market.',
    topThreeFixes: [
      'Lead with the client’s problem, not your founding year',
      'One call to action, above the fold, in plain language',
      'Proof within the first screen — results, not adjectives',
    ],
    capturedAt: Date.now() - 2 * DAY,
  },
  competitor: {
    executiveSummary:
      'Two of your three tracked rivals now lead with fixed-fee packaging and publish pricing guidance; none of them can match your litigation depth, but they are winning the first click.',
    recommendedMoves: [
      { move: 'Publish a pricing-approach page', impact: 'high' },
      { move: 'Claim the “startup counsel” niche they ignore', impact: 'high' },
      { move: 'Match their review velocity on Google', impact: 'medium' },
    ],
    capturedAt: Date.now() - 4 * DAY,
  },
  roadmap: {
    summary: 'Ninety days from interchangeable to obviously-different: fix the first impression, then out-publish, then out-proof.',
    phases: [
      { label: 'Days 1–30', actions: [{ title: 'Rewrite the homepage hero' }, { title: 'Fix the three roast findings' }] },
      { label: 'Days 31–60', actions: [{ title: 'Ship four thought-leadership posts' }, { title: 'Launch review outreach' }] },
      { label: 'Days 61–90', actions: [{ title: 'Publish the pricing-approach page' }, { title: 'Re-run the visibility audit' }] },
    ],
    capturedAt: Date.now() - 4 * DAY,
  },
  maturity: null,
  headline: null,
  bio: null,
  visibilityScore: {
    totalScore: 113,
    percentile: 8,
    peerCount: 44,
    capturedAt: Date.now() - 1 * DAY,
  },
});

interface UserStateResponse {
  state?: Record<string, unknown>;
}

export function useBattlePlanSlots() {
  const { user, session } = useAuth();
  const { isDemo } = useData();
  const [slots, setSlots] = useState<BattlePlanSlots>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);

  // In-flight guard: a user-state-get response must never outlive the auth
  // context that asked for it. Every load() call bumps the generation and a
  // response only commits while it's still the latest one and the screen is
  // mounted — otherwise a late reply could paint the previous signed-in
  // user's plan onto a signed-out (or another user's) screen.
  const generation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    // Strict Mode replays mount effects (setup → cleanup → setup) in dev —
    // re-assert true on every setup so the replay's cleanup can't leave the
    // guard permanently closed.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const gen = ++generation.current;
    // Promotion side effects (push/clear) need the same staleness guard as
    // state commits: an account switch mid-load must not push the on-device
    // run into the *previous* account or clear it before the current one
    // gets its chance (found in code review).
    const stillCurrent = () => mounted.current && gen === generation.current;
    const commit = (fn: () => void) => {
      if (stillCurrent()) fn();
    };

    if (isDemo || !user || !session) {
      // Runs made in demo/anonymous mode persist on-device only (the tool
      // screen says so honestly) — merge them over the base plan so the
      // section the user just filled doesn't pretend to be empty.
      const base = isDemo ? demoSlots() : EMPTY_SLOTS;
      const local = await readLocalSlots();
      commit(() => {
        setSlots({
          ...base,
          headline: local.headline ?? base.headline,
          bio: local.bio ?? base.bio,
        });
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    // One batched round-trip for all 7 slots, same call shape as the web.
    const res = await callEdgeFunction<UserStateResponse & { resolvedClientId?: unknown }>(
      'user-state-get',
      {
        clientId: user.id,
        accessToken: session.access_token,
        keys: Object.values(SERVER_KEYS),
      },
    );
    const next = { ...EMPTY_SLOTS };
    if (res.ok) {
      // The server reports which identity the token resolved to (solo uid or
      // shared firm). Echo it back as requestedFirmId on the promotion write
      // so GET and SET provably target the same account — for consultants
      // with several client firms the resolver could otherwise pick a
      // different one on each call (found in code review). The resolver
      // honors it only when it's a live member firm, so a stale/foreign
      // value degrades safely to the normal auto-detection.
      const resolvedClientId =
        typeof res.data?.resolvedClientId === 'string' ? res.data.resolvedClientId : undefined;
      const state = res.data?.state ?? {};
      (Object.keys(SERVER_KEYS) as StepKey[]).forEach((slot) => {
        const value = state[SERVER_KEYS[slot]];
        if (value && typeof value === 'object') {
          // The web writes these payloads; trust the shape, ignore extras.
          (next as Record<string, unknown>)[slot] = value;
        }
      });

      // Promote on-device demo/anonymous runs into the account — the same
      // local→server promotion the web's useBattlePlanCache does on login.
      // The write is create-if-absent, decided atomically server-side: a
      // value another device lands between our GET and this write always
      // wins, and the response hands back the authoritative stored value.
      // The local copy clears on either outcome (that's pushed-once); only
      // a transport failure keeps it, so the next load retries.
      if (stillCurrent()) {
        const local = await readLocalSlots();
        await Promise.all(
          (['headline', 'bio'] as const).map(async (slot) => {
            const localValue = local[slot];
            if (!localValue || !stillCurrent()) return;
            if (next[slot]) {
              await clearLocalSlot(slot, localValue);
              return;
            }
            const push = await callEdgeFunction<{ created?: boolean; value?: unknown }>('user-state-set', {
              clientId: user.id,
              accessToken: session.access_token,
              key: SERVER_KEYS[slot],
              value: localValue,
              ifAbsent: true,
              requestedFirmId: resolvedClientId,
            });
            if (push.ok && stillCurrent()) {
              const authoritative = push.data?.value;
              (next as Record<string, unknown>)[slot] =
                authoritative && typeof authoritative === 'object' ? authoritative : localValue;
              await clearLocalSlot(slot, localValue);
            }
          }),
        );
      }
    }

    commit(() => {
      if (res.ok) setSlots(next);
      // On failure keep whatever was there (empty on first load) — the cards'
      // empty states are a fine fallback and the screen has pull-to-refresh.
      setLoading(false);
    });
  }, [user, session, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  return { slots, loading, refresh: load, isDemo, signedIn: !!user };
}
