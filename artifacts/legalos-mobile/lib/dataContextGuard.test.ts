// @vitest-environment jsdom
//
// Regression tests for the DataContext identity race (fixed 2026-08-15):
// an in-flight fetch for account A must never write A's data into account
// B's session, and sign-out must reset every piece of per-account state.
// Both were high-severity review findings with no coverage — a refactor
// that drops the epoch/userId guard or the reset effect fails here.
//
// The provider is driven for real (renderHook); only the auth source, the
// network seam, and the RN error component are mocked.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  loadMock: vi.fn(),
  // Mutated per test step; the mocked useAuth reads whatever is current.
  // deno-lint-ignore no-explicit-any
  auth: { user: null as any, session: null as any },
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/lib/auditData', () => ({ loadSignedInData: h.loadMock }));
vi.mock('@/components/AuditLoadError', () => ({ AuditLoadError: () => null }));

import { DataProvider, useData, DEMO_FIRM, getCategories } from '@/context/DataContext';
import type { Firm, Provenance } from '@/context/DataContext';
import { computeMeasuredTotals } from './measuredScore';

const FULL_PROV: Provenance = {
  performance: 'api', social: 'api', seoAuthority: 'api', thoughtLeadership: 'api', reputation: 'api',
};

function makeFirm(id: string): Firm {
  return {
    id, rank: 3, name: `Firm ${id}`, domain: `${id}.rs`, score: 120, percentile: 10,
    visibilityPercent: 60, hasFullAudit: true,
    performance: 12, social: 14, seoAuthority: 30, thoughtLeadership: 30, reputation: 34,
    provenance: FULL_PROV,
  };
}

function payload(firmId: string) {
  return { ok: true as const, hasAudit: true, firm: makeFirm(firmId), leaderboard: [makeFirm(firmId)], auditHistory: [] };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

// deno-lint-ignore no-explicit-any
const wrapper = ({ children }: any) => React.createElement(DataProvider, null, children);

function signIn(userId: string) {
  h.auth = { user: { id: userId }, session: { access_token: `token-${userId}` } };
}

describe('DataContext identity guards', () => {
  it('uses the available SEO & Authority ranking in the representative firm', () => {
    const categories = getCategories(DEMO_FIRM);
    const measured = computeMeasuredTotals(categories);

    expect(DEMO_FIRM.seoAuthority).toBe(30);
    expect(DEMO_FIRM.provenance.seoAuthority).toBe('api');
    expect(DEMO_FIRM.score).toBe(115);
    // Math.round(115/200 * 100) = 57 (IEEE 754: 0.575 * 100 = 57.499...)
    expect(DEMO_FIRM.visibilityPercent).toBe(57);
    expect(measured.measuredMax).toBe(200);
    expect(measured.isPartial).toBe(false);
    expect(measured.excludedLabels).toEqual([]);
  });

  it('discards a fetch that completes after the identity changed', async () => {
    const dA = deferred<ReturnType<typeof payload>>();
    const dB = deferred<ReturnType<typeof payload>>();
    h.loadMock.mockImplementation((userId: string) => (userId === 'user-a' ? dA.promise : dB.promise));

    signIn('user-a');
    const { result, rerender } = renderHook(() => useData(), { wrapper });
    expect(h.loadMock).toHaveBeenCalledWith('user-a', 'token-user-a');

    // Account switches while A's fetch is still in flight.
    signIn('user-b');
    rerender();
    expect(h.loadMock).toHaveBeenCalledWith('user-b', 'token-user-b');

    // A's fetch finally resolves — it must be discarded, not written into
    // B's session.
    await act(async () => { dA.resolve(payload('firm-a')); });
    expect(result.current.firm.id).toBe(DEMO_FIRM.id);
    expect(result.current.isDemo).toBe(true);

    // B's own fetch resolves — only now does real data appear, and it's B's.
    await act(async () => { dB.resolve(payload('firm-b')); });
    expect(result.current.firm.id).toBe('firm-b');
    expect(result.current.isDemo).toBe(false);
  });

  it('resets all per-account state on sign-out', async () => {
    h.loadMock.mockResolvedValue(payload('firm-a'));
    signIn('user-a');
    const { result, rerender } = renderHook(() => useData(), { wrapper });
    await act(async () => {});
    expect(result.current.firm.id).toBe('firm-a');
    expect(result.current.isDemo).toBe(false);

    h.auth = { user: null, session: null };
    rerender();
    await act(async () => {});

    expect(result.current.firm.id).toBe(DEMO_FIRM.id);
    expect(result.current.isDemo).toBe(true);
    expect(result.current.hasNoAudit).toBe(false);
    expect(result.current.refreshError).toBeNull();
    expect(result.current.loadError).toBeNull();
    expect(result.current.auditHistory).toEqual([]);
  });

  it('clears the no-audit flag on sign-out too', async () => {
    h.loadMock.mockResolvedValue({ ok: true as const, hasAudit: false, auditHistory: [] });
    signIn('user-a');
    const { result, rerender } = renderHook(() => useData(), { wrapper });
    await act(async () => {});
    expect(result.current.hasNoAudit).toBe(true);

    h.auth = { user: null, session: null };
    rerender();
    await act(async () => {});
    expect(result.current.hasNoAudit).toBe(false);
  });
});
