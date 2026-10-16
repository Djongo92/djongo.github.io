// Signed-in notification inbox — mirrors the web hook (3-minute poll,
// optimistic mark-all-read). Returns empty state when signed out; callers
// gate rendering on auth identity, never on data availability (see
// mobile-demo-gating).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/notifications';

const POLL_MS = 3 * 60 * 1000;
const EMPTY: AppNotification[] = [];

/** The inbox with the identity that fetched it — ownership is stored WITH
 *  the data so the render-time invariant below needs no cleanup effect. */
interface Inbox {
  owner: string;
  list: AppNotification[];
  unread: number;
}

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;
  const [inbox, setInbox] = useState<Inbox | null>(null);

  // Cross-account privacy (code review, render-time): the inbox is exposed
  // ONLY when its owner IS the current identity. Effects run after paint,
  // so clearing in an effect would still leak one frame of account A's rows
  // to account B — the ownership check below can't, it applies during render.
  const identityRef = useRef(userId);
  identityRef.current = userId;
  const owned = inbox !== null && inbox.owner === userId && userId !== null ? inbox : null;

  const refresh = useCallback(async () => {
    if (!userId || !token) return;
    try {
      const { notifications: list, unreadCount: unread } = await fetchNotifications(userId, token);
      // Identity may have changed while the fetch was in flight — never
      // commit a response that belongs to the previous account.
      if (identityRef.current !== userId) return;
      setInbox({ owner: userId, list, unread });
    } catch {
      // Best-effort — the bell shows whatever it last had.
    }
  }, [userId, token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId || !token || !owned || owned.unread === 0) return;
    const now = new Date().toISOString();
    setInbox((prev) =>
      prev && prev.owner === userId
        ? { ...prev, list: prev.list.map((n) => ({ ...n, read_at: n.read_at ?? now })), unread: 0 }
        : prev,
    );
    try {
      await markAllNotificationsRead(userId, token);
    } catch {
      // Best-effort — worst case it re-shows as unread next refresh.
    }
  }, [userId, token, owned]);

  return {
    notifications: owned?.list ?? EMPTY,
    unreadCount: owned?.unread ?? 0,
    refresh,
    markAllRead,
  };
}
