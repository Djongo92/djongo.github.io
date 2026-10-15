// @vitest-environment jsdom
//
// Cross-account privacy (code review): the notification inbox belongs to ONE
// signed-in identity. On sign-out or account switch the hook must drop every
// row immediately, and a response already in flight for the previous account
// must never be committed. Same guarantee useFirmContext makes for context.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as { id: string } | null,
    session: null as { access_token: string; user: { id: string } } | null,
    isLoading: false,
  },
  fetchNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/lib/notifications', () => ({
  fetchNotifications: (...args: unknown[]) => mocks.fetchNotifications(...args),
  markAllNotificationsRead: (...args: unknown[]) => mocks.markAllNotificationsRead(...args),
}));

import { useNotifications } from './useNotifications';

const A_ROW = { id: 'n-a', type: 'score_digest', title: 'A digest', body: 'A body', created_at: 'x', read_at: null };
const B_ROW = { id: 'n-b', type: 'score_digest', title: 'B digest', body: 'B body', created_at: 'y', read_at: null };

const signIn = (id: string) => {
  mocks.auth.user = { id };
  mocks.auth.session = { access_token: `jwt-${id}`, user: { id } };
};
const signOut = () => {
  mocks.auth.user = null;
  mocks.auth.session = null;
};

beforeEach(() => {
  mocks.fetchNotifications.mockReset();
  mocks.markAllNotificationsRead.mockReset();
  signOut();
});

describe('useNotifications identity transitions', () => {
  it('sign-out clears the inbox immediately — nothing of account A survives', async () => {
    mocks.fetchNotifications.mockResolvedValue({ notifications: [A_ROW], unreadCount: 1 });
    signIn('user-a');
    const { result, rerender } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    signOut();
    rerender();
    // Cleared synchronously on the identity change — no await needed.
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('A → B: B never sees A rows, and A’s in-flight response is discarded', async () => {
    // A's fetch hangs until we release it — simulating a slow network.
    let releaseA: (v: unknown) => void = () => {};
    mocks.fetchNotifications.mockImplementation((clientId: string) =>
      clientId === 'user-a'
        ? new Promise((res) => { releaseA = res; })
        : Promise.resolve({ notifications: [B_ROW], unreadCount: 1 }),
    );

    signIn('user-a');
    const { result, rerender } = renderHook(() => useNotifications());

    // Switch to B while A's fetch is still in flight.
    signIn('user-b');
    rerender();
    expect(result.current.notifications).toEqual([]); // cleared on the switch

    // A's slow response now arrives — it must NOT be committed.
    releaseA!({ notifications: [A_ROW], unreadCount: 9 });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].id).toBe('n-b');
    expect(result.current.unreadCount).toBe(1);
  });

  it('signed-out renders empty and never calls the server', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
    expect(mocks.fetchNotifications).not.toHaveBeenCalled();
  });
});
