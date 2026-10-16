// @vitest-environment jsdom
//
// The core guarantee: a signed-in account never submits the demo firm's
// context. The hook gates on authentication (not DataContext.isDemo, which
// only flips after a visibility-audit round-trip), starts authenticated
// sessions at null, and discards stale responses across auth transitions.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { id: string } | null,
    session: null as { access_token: string } | null,
    isLoading: false,
  },
  callEdge: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/api', () => ({ callEdgeFunction: mocks.callEdge }));

import { useFirmContext } from './useFirmContext';
import { DEMO_FIRM_CONTEXT, buildFirmContextSetBody } from '@/lib/firmContext';

const REAL = {
  practiceArea: 'Employment & Labour',
  firmSize: '2-10 attorneys',
  primaryGoal: 'Own the startup-employer niche',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useFirmContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { user: null, session: null, isLoading: false };
  });

  it('never exposes demo context while auth restoration is in flight for a persisted session', async () => {
    // App cold start: AuthContext begins isLoading=true with no user yet,
    // then restores a signed-in session. Demo facts must never appear.
    mocks.auth = { user: null, session: null, isLoading: true };
    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    const { result, rerender } = renderHook(() => useFirmContext());
    expect(result.current.firmContext).toBeNull();

    act(() => {
      mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    });
    rerender();
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());
    expect(result.current.firmContext).toBeNull();

    await act(async () => {
      d.resolve({ ok: true, data: { state: { firm_context: REAL } } });
    });
    expect(result.current.firmContext).toEqual(REAL);
  });

  it('shows demo context only after restoration completes signed out', async () => {
    mocks.auth = { user: null, session: null, isLoading: true };
    const { result, rerender } = renderHook(() => useFirmContext());
    expect(result.current.firmContext).toBeNull();

    act(() => {
      mocks.auth = { user: null, session: null, isLoading: false };
    });
    rerender();
    await waitFor(() => expect(result.current.firmContext).toEqual(DEMO_FIRM_CONTEXT));
    expect(mocks.callEdge).not.toHaveBeenCalled();
  });

  it('signed out: demo firm context, no server call', () => {
    const { result } = renderHook(() => useFirmContext());
    expect(result.current.firmContext).toEqual(DEMO_FIRM_CONTEXT);
    expect(mocks.callEdge).not.toHaveBeenCalled();
  });

  it('signed in: starts null while loading — never the demo object', async () => {
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    const { result } = renderHook(() => useFirmContext());

    // Mid-flight, a run must carry nothing, not Petrović & Partners.
    expect(result.current.firmContext).toBeNull();

    await act(async () => {
      d.resolve({ ok: true, data: { state: { firm_context: REAL } } });
    });
    expect(result.current.firmContext).toEqual(REAL);
    expect(mocks.callEdge).toHaveBeenCalledWith(
      'user-state-get',
      expect.objectContaining({ clientId: 'u1', accessToken: 'tok', keys: ['firm_context'] }),
    );
  });

  it('signed in with no stored context (e.g. no audit yet): stays null, not demo', async () => {
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    mocks.callEdge.mockResolvedValue({ ok: true, data: { state: {} } });
    const { result } = renderHook(() => useFirmContext());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.firmContext).toBeNull();
  });

  it('signed in with fetch failure: stays null, not demo', async () => {
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    mocks.callEdge.mockResolvedValue({ ok: false, error: 'boom' });
    const { result } = renderHook(() => useFirmContext());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.firmContext).toBeNull();
    expect(result.current.resolvedClientId).toBeUndefined();
  });

  it('sign-in transition clears the demo value immediately, before the fetch resolves', async () => {
    const { result, rerender } = renderHook(() => useFirmContext());
    expect(result.current.firmContext).toEqual(DEMO_FIRM_CONTEXT);

    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    act(() => {
      mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    });
    rerender();
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());
    // Demo facts are gone the moment an authenticated lookup starts.
    expect(result.current.firmContext).toBeNull();

    await act(async () => {
      d.resolve({ ok: true, data: { state: { firm_context: REAL } } });
    });
    expect(result.current.firmContext).toEqual(REAL);
  });

  it('the read-resolved firm flows into the save body a profile write sends', async () => {
    // Multi-firm accounts: the resolver may auto-detect a different member
    // firm on each call, so the firm-profile screen pins the write to the
    // firm the read resolved to (reviewer-found gap — useBattlePlanSlots
    // already does this).
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    mocks.callEdge.mockResolvedValue({
      ok: true,
      data: { state: { firm_context: REAL }, resolvedClientId: 'firm-9' },
    });
    const { result } = renderHook(() => useFirmContext());
    await waitFor(() => expect(result.current.firmContext).toEqual(REAL));
    expect(result.current.resolvedClientId).toBe('firm-9');

    // Exactly what the firm-profile screen does on save.
    const body = buildFirmContextSetBody('u1', 'tok', REAL, result.current.resolvedClientId);
    expect(body).toEqual({
      clientId: 'u1',
      accessToken: 'tok',
      key: 'firm_context',
      value: REAL,
      requestedFirmId: 'firm-9',
    });
  });

  it('clears the resolved firm id on sign-out and never exposes one signed out', async () => {
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    mocks.callEdge.mockResolvedValue({
      ok: true,
      data: { state: { firm_context: REAL }, resolvedClientId: 'firm-9' },
    });
    const { result, rerender } = renderHook(() => useFirmContext());
    await waitFor(() => expect(result.current.resolvedClientId).toBe('firm-9'));

    act(() => {
      mocks.auth = { user: null, session: null, isLoading: false };
    });
    rerender();
    expect(result.current.resolvedClientId).toBeUndefined();
  });

  it('a stale response from a previous account never lands after sign-out', async () => {
    mocks.auth = { user: { id: 'u1' }, session: { access_token: 'tok' }, isLoading: false };
    const d = deferred<unknown>();
    mocks.callEdge.mockReturnValue(d.promise);
    const { result, rerender } = renderHook(() => useFirmContext());
    await waitFor(() => expect(mocks.callEdge).toHaveBeenCalled());

    act(() => {
      mocks.auth = { user: null, session: null, isLoading: false };
    });
    rerender();
    expect(result.current.firmContext).toEqual(DEMO_FIRM_CONTEXT);

    await act(async () => {
      d.resolve({ ok: true, data: { state: { firm_context: REAL } } });
    });
    // The old account's context must not overwrite the signed-out state.
    expect(result.current.firmContext).toEqual(DEMO_FIRM_CONTEXT);
  });
});
