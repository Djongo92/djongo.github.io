// Firm-invite redemption contract (mobile port of JoinFirm.tsx). The real
// supabase module builds a client on import (AsyncStorage/window), so it's
// stubbed at the module seam — same approach as auditData.test.ts. fetch is
// stubbed per-case so we assert the exact request the edge function expects.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  edgeHeaders: (accessToken?: string | null) => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer anon',
    apikey: 'anon',
    ...(accessToken ? { 'x-user-token': accessToken } : {}),
  }),
}));

import { redeemFirmInvite } from './firmInvite';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('redeemFirmInvite', () => {
  it('posts the redeem contract with the session token in body and header', async () => {
    const f = mockFetch(200, { firmName: 'Acme Law' });
    vi.stubGlobal('fetch', f);

    const result = await redeemFirmInvite('jwt-123', 'tok-abc');

    expect(result).toEqual({ ok: true, firmName: 'Acme Law' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/firm-invite');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      accessToken: 'jwt-123',
      action: 'redeem',
      token: 'tok-abc',
    });
    // Memory: the session JWT must ride in its own header, not Authorization.
    expect((init as RequestInit).headers).toMatchObject({ 'x-user-token': 'jwt-123' });
  });

  it('falls back to "the firm" when the server omits firmName', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {}));
    const result = await redeemFirmInvite('jwt', 'tok');
    expect(result).toEqual({ ok: true, firmName: 'the firm' });
  });

  it('surfaces the server error message on a non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'Invite expired' }));
    const result = await redeemFirmInvite('jwt', 'tok');
    expect(result).toEqual({ ok: false, error: 'Invite expired' });
  });

  it('gives a generic message when the error body is missing', async () => {
    vi.stubGlobal('fetch', mockFetch(500, ''));
    const result = await redeemFirmInvite('jwt', 'tok');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Couldn't join that firm.");
  });

  it('reports a reach error when the fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await redeemFirmInvite('jwt', 'tok');
    expect(result).toEqual({ ok: false, error: "Couldn't reach the invite service." });
  });
});
