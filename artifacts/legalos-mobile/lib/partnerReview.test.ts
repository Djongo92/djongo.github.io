// Battle Plan partner-review contract (mobile port of PartnerReview.tsx).
// view/comment/approve are public (linkId is the bearer token), so no session
// header — the stub returns anon-only headers. supabase is stubbed at the
// module seam (same as auditData.test.ts); fetch is stubbed per-case.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  edgeHeaders: () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer anon',
    apikey: 'anon',
  }),
}));

import { loadPartnerReview, postPartnerComment, approvePartnerItem } from './partnerReview';

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

describe('loadPartnerReview', () => {
  it('posts the view action and normalizes the board', async () => {
    const f = mockFetch(200, {
      recipientLabel: 'Jane at Acme',
      items: [{ id: 'i1', title: 'Draft', description: null, status: 'in_review', due_date: null }],
      comments: [],
    });
    vi.stubGlobal('fetch', f);

    const board = await loadPartnerReview('link-1');

    expect(board.recipientLabel).toBe('Jane at Acme');
    expect(board.items).toHaveLength(1);
    expect(board.comments).toEqual([]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/workflow-partner-link');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ action: 'view', linkId: 'link-1' });
    // No session header — the link id is the auth.
    expect((init as RequestInit).headers).not.toHaveProperty('x-user-token');
  });

  it('defaults missing fields so an empty board is safe to render', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {}));
    const board = await loadPartnerReview('link-1');
    expect(board).toEqual({ recipientLabel: null, items: [], comments: [] });
  });

  it('throws the server message for an expired/invalid link', async () => {
    vi.stubGlobal('fetch', mockFetch(410, { error: 'This link has expired' }));
    await expect(loadPartnerReview('link-1')).rejects.toThrow('This link has expired');
  });
});

describe('postPartnerComment', () => {
  it('posts the comment action with body (text only, no voice)', async () => {
    const f = mockFetch(200, { ok: true });
    vi.stubGlobal('fetch', f);

    await postPartnerComment('link-1', 'i1', 'Looks good');

    const payload = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(payload).toEqual({ action: 'comment', linkId: 'link-1', itemId: 'i1', body: 'Looks good' });
    expect(payload).not.toHaveProperty('voiceNoteDataUrl');
  });

  it('throws the server message on failure', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'nope' }));
    await expect(postPartnerComment('l', 'i', 'x')).rejects.toThrow('nope');
  });
});

describe('approvePartnerItem', () => {
  it('posts the approve action', async () => {
    const f = mockFetch(200, { ok: true });
    vi.stubGlobal('fetch', f);

    await approvePartnerItem('link-1', 'i1');

    const payload = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(payload).toEqual({ action: 'approve', linkId: 'link-1', itemId: 'i1' });
  });
});
