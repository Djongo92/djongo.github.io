// The digest landing surface: the mobile inbox must send identity the same
// way the web hook does (verified accessToken, never a bare clientId) and
// degrade to an empty inbox — never demo data — when the call fails.
import { describe, it, expect, vi } from 'vitest';

// vi.hoisted: the vi.mock factory is hoisted above all imports/consts, so
// the mock fn must be created in a hoisted block — a closure over a plain
// const resolves unreliably under vitest 4's transform.
const mocks = vi.hoisted(() => ({ callFunction: vi.fn() }));
vi.mock('./supabase', () => ({ callFunction: mocks.callFunction }));
const callFunction = mocks.callFunction;

import { fetchNotifications, markAllNotificationsRead } from './notifications';

// NOTE: no beforeEach reset/clear — under vitest 4, any mock reset before a
// mockRejectedValue gets the (caught!) rejection flagged as unhandled and
// fails the test (verified by bisection: identical code passes without the
// hook). Each test sets its own implementation; the call-history assertions
// use toHaveBeenCalledWith, which tolerates accumulated history.

describe('fetchNotifications', () => {
  it('posts clientId + accessToken to notifications-get', async () => {
    callFunction.mockResolvedValue({ notifications: [], unreadCount: 0 });
    await fetchNotifications('user-1', 'jwt-1');
    expect(callFunction).toHaveBeenCalledWith('notifications-get', { clientId: 'user-1', accessToken: 'jwt-1' });
  });

  it('returns the list and unread count, defaulting missing fields', async () => {
    callFunction.mockResolvedValue({
      notifications: [{ id: 'n1', type: 'score_digest', title: 'Up', body: null, created_at: 'x', read_at: null }],
      unreadCount: 1,
    });
    const res = await fetchNotifications('user-1', 'jwt-1');
    expect(res.unreadCount).toBe(1);
    expect(res.notifications[0].type).toBe('score_digest');

    callFunction.mockResolvedValue({});
    expect(await fetchNotifications('user-1', 'jwt-1')).toEqual({ notifications: [], unreadCount: 0 });
  });

  it('a failed call throws — the hook catches and keeps the last state (never fabricates rows)', async () => {
    callFunction.mockRejectedValue(new Error('HTTP 401'));
    let caught: unknown = null;
    try {
      await fetchNotifications('user-1', 'jwt-1');
    } catch (e) {
      caught = e;
    }
    expect(String(caught)).toContain('HTTP 401');
  });
});

describe('markAllNotificationsRead', () => {
  it('posts to notifications-mark-read with the same identity contract', async () => {
    callFunction.mockResolvedValue({ ok: true });
    await markAllNotificationsRead('user-1', 'jwt-1');
    expect(callFunction).toHaveBeenCalledWith('notifications-mark-read', { clientId: 'user-1', accessToken: 'jwt-1' });
  });
});
