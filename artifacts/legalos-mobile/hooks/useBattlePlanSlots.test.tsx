// @vitest-environment jsdom
//
// Lifecycle guard for the Battle Plan slot loader: a user-state-get response
// must never commit after the auth/demo context that requested it changed —
// otherwise a sign-out or account switch could paint the previous user's
// plan onto the wrong screen (found in code review).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { StrictMode, type ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, session: null as { access_token: string } | null },
  demo: { isDemo: false },
  callEdge: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/context/DataContext', () => ({ useData: () => mocks.demo }));
vi.mock('@/lib/api', () => ({ callEdgeFunction: mocks.callEdge }));

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
import { useBattlePlanSlots } from './useBattlePlanSlots';

const ROAST = { grade: 'B', verdict: 'real user roast', topThreeFixes: ['x'], capturedAt: 1 };
const ROADMAP = { summary: 'newer roadmap', phases: [], capturedAt: 2 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useBattlePlanSlots', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' } };
    mocks.demo = { isDemo: false };
  });

  it('commits server slots for the signed-in user', async () => {
    mocks.callEdge.mockResolvedValue({ ok: true, data: { state: { battleplan_roast: ROAST } } });
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots.roast?.verdict).toBe('real user roast');
    expect(result.current.slots.roadmap).toBeNull();
    // The batched call shape must match the web contract.
    expect(mocks.callEdge).toHaveBeenCalledWith(
      'user-state-get',
      expect.objectContaining({ clientId: 'u1', accessToken: 'tok', keys: expect.arrayContaining(['battleplan_roast']) }),
    );
  });

  it('discards an in-flight response when the user signs out mid-request', async () => {
    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    const { result, rerender } = renderHook(() => useBattlePlanSlots());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());

    // Sign out while the request is in flight, then re-render so the hook
    // observes the new auth state — the screen clears.
    act(() => {
      mocks.auth = { user: null, session: null };
    });
    rerender();
    expect(result.current.signedIn).toBe(false);

    // The stale response arrives late and must not paint the old user's plan.
    await act(async () => {
      d.resolve({ ok: true, data: { state: { battleplan_roast: ROAST } } });
    });
    expect(result.current.slots.roast).toBeNull();
  });

  it('lets the newer refresh win over an older in-flight one', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mocks.callEdge.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useBattlePlanSlots());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.refresh();
    });
    expect(mocks.callEdge).toHaveBeenCalledTimes(2);

    // Newer response first, then the older one — the older must be ignored.
    await act(async () => {
      second.resolve({ ok: true, data: { state: { battleplan_roadmap: ROADMAP } } });
    });
    await act(async () => {
      first.resolve({ ok: true, data: { state: { battleplan_roast: ROAST } } });
    });
    expect(result.current.slots.roadmap?.summary).toBe('newer roadmap');
    expect(result.current.slots.roast).toBeNull();
  });

  it('still commits the current request under Strict Mode effect replay', async () => {
    // Strict Mode runs setup → cleanup → setup in dev; the cleanup must not
    // leave the mounted guard permanently closed (found in code review).
    mocks.callEdge.mockResolvedValue({ ok: true, data: { state: { battleplan_roast: ROAST } } });
    const { result } = renderHook(() => useBattlePlanSlots(), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });

    await waitFor(() => expect(result.current.slots.roast?.verdict).toBe('real user roast'));
    expect(result.current.loading).toBe(false);
  });

  it('ignores a response that resolves after unmount', async () => {
    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    const { unmount } = renderHook(() => useBattlePlanSlots());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());

    unmount();
    // Resolving after unmount must be a clean no-op — no commit, no throw.
    await act(async () => {
      d.resolve({ ok: true, data: { state: { battleplan_roast: ROAST } } });
    });
  });

  it('serves the demo plan without touching the network in demo mode', async () => {
    mocks.demo = { isDemo: true };
    mocks.auth = { user: null, session: null };
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots.roast).not.toBeNull();
    expect(result.current.slots.maturity).toBeNull(); // deliberately partial
    expect(mocks.callEdge).not.toHaveBeenCalled();
  });

  it('merges an on-device demo run over the demo plan', async () => {
    mocks.demo = { isDemo: true };
    mocks.auth = { user: null, session: null };
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'demo run headline', angle: 'Proof', why: 'w', brief: 'b', capturedAt: 1 }),
    );
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots.headline?.text).toBe('demo run headline');
    expect(result.current.slots.roast).not.toBeNull(); // base demo plan intact
    expect(mocks.callEdge).not.toHaveBeenCalled();
  });

  it('arms a section for a signed-out user from on-device runs only', async () => {
    mocks.auth = { user: null, session: null };
    await AsyncStorage.setItem(
      'battleplan_local_bio',
      JSON.stringify({ emphases: [], rewrite: 'local bio rewrite', capturedAt: 2 }),
    );
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots.bio?.rewrite).toBe('local bio rewrite');
    expect(result.current.slots.roast).toBeNull();
    expect(mocks.callEdge).not.toHaveBeenCalled();
  });

  it('promotes an on-device run into the account when the server has none', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'Proof', why: 'w', brief: 'b', capturedAt: 1 }),
    );
    mocks.callEdge.mockResolvedValue({
      ok: true,
      data: { state: { battleplan_roast: ROAST }, resolvedClientId: 'firm-1' },
    });
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.slots.headline?.text).toBe('local champion'));
    expect(mocks.callEdge).toHaveBeenCalledWith(
      'user-state-set',
      expect.objectContaining({
        clientId: 'u1',
        accessToken: 'tok',
        key: 'battleplan_headline',
        value: expect.objectContaining({ text: 'local champion' }),
        ifAbsent: true,
        // Pinned to the identity the GET resolved to — GET and SET can never
        // target different firms for a multi-firm consultant.
        requestedFirmId: 'firm-1',
      }),
    );
    // Pushed-once: the local copy is gone, so no later session can re-push.
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('lets the server value win and clears the local copy when both exist', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'A', capturedAt: 1 }),
    );
    mocks.callEdge.mockResolvedValue({
      ok: true,
      data: { state: { battleplan_headline: { text: 'server champion', angle: 'B', capturedAt: 9 } } },
    });
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots.headline?.text).toBe('server champion');
    expect(mocks.callEdge).not.toHaveBeenCalledWith('user-state-set', expect.anything());
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('keeps the local copy for next time when the promotion push fails', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_bio',
      JSON.stringify({ emphases: [], rewrite: 'local bio', capturedAt: 2 }),
    );
    mocks.callEdge.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'user-state-get' ? { ok: true, data: { state: {} } } : { ok: false, error: 'boom' },
      ),
    );
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Not shown until it actually syncs — the signed-in plan stays honest.
    expect(result.current.slots.bio).toBeNull();
    expect(await AsyncStorage.getItem('battleplan_local_bio')).not.toBeNull();
  });

  it('leaves on-device copies untouched when the server fetch itself fails', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'A', capturedAt: 1 }),
    );
    mocks.callEdge.mockResolvedValue({ ok: false, error: 'Network error. Check your connection and try again.' });
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.callEdge).not.toHaveBeenCalledWith('user-state-set', expect.anything());
    expect(await AsyncStorage.getItem('battleplan_local_headline')).not.toBeNull();
  });

  it('shows the authoritative server value when promotion loses the atomic race', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'A', capturedAt: 1 }),
    );
    // The GET saw an empty slot, but another device landed a value before
    // our create-if-absent write — the server answers with the winner.
    mocks.callEdge.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'user-state-get'
          ? { ok: true, data: { state: {} } }
          : { ok: true, data: { created: false, value: { text: 'server champion', angle: 'B', capturedAt: 9 } } },
      ),
    );
    const { result } = renderHook(() => useBattlePlanSlots());

    await waitFor(() => expect(result.current.slots.headline?.text).toBe('server champion'));
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('uses the create-if-absent contract for every promotion, even under overlapping loads', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'A', capturedAt: 1 }),
    );
    mocks.callEdge.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'user-state-get'
          ? { ok: true, data: { state: {} } }
          : { ok: true, data: { created: true, value: null } },
      ),
    );
    // Two screens (or a Strict-Mode replay) load at once: both may attempt
    // the promotion, but every attempt must carry ifAbsent so the server —
    // not the race — decides which write lands, and both clear the copy.
    const first = renderHook(() => useBattlePlanSlots());
    const second = renderHook(() => useBattlePlanSlots());

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
      expect(second.result.current.loading).toBe(false);
    });
    const setCalls = mocks.callEdge.mock.calls.filter(([n]) => n === 'user-state-set');
    expect(setCalls.length).toBeGreaterThan(0);
    for (const [, body] of setCalls) {
      expect(body).toMatchObject({ ifAbsent: true });
    }
    expect(await AsyncStorage.getItem('battleplan_local_headline')).toBeNull();
  });

  it('abandons promotion side effects when the user signs out mid-push', async () => {
    await AsyncStorage.setItem(
      'battleplan_local_headline',
      JSON.stringify({ text: 'local champion', angle: 'A', capturedAt: 1 }),
    );
    const get = deferred<unknown>();
    const set = deferred<unknown>();
    mocks.callEdge.mockImplementation((name: string) =>
      name === 'user-state-get' ? get.promise : set.promise,
    );
    const { rerender } = renderHook(() => useBattlePlanSlots());

    // The GET completes and the promotion write goes out for user A…
    await act(async () => {
      get.resolve({ ok: true, data: { state: {} } });
    });
    await waitFor(() =>
      expect(mocks.callEdge).toHaveBeenCalledWith('user-state-set', expect.anything()),
    );

    // …but A signs out before it lands. The stale load must not commit or
    // clear — the on-device copy survives for whoever owns the device now.
    act(() => {
      mocks.auth = { user: null, session: null };
    });
    rerender();
    await act(async () => {
      set.resolve({ ok: true, data: { created: true, value: null } });
    });
    expect(await AsyncStorage.getItem('battleplan_local_headline')).not.toBeNull();
  });
});
