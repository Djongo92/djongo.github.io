// Real notification inbox for a signed-in account — see
// 20260722060000_notifications.sql for why the sidebar Bell needed this
// instead of the derived "things currently wrong" list it used to show.
// Anonymous/demo use never calls this (no accessToken to resolve a real
// identity from), matching every other real-account-only feature.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { edgeHeaders } from "@/lib/edgeAuth";
import { getOrCreateClientId } from "@/lib/clientId";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const POLL_MS = 3 * 60 * 1000;
const DESKTOP_NOTIFICATIONS_KEY = "desktop_notifications_enabled";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export function isDesktopNotificationsEnabled(): boolean {
  return localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY) === "1";
}

export async function enableDesktopNotifications(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  const granted = permission === "granted";
  localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, granted ? "1" : "0");
  return granted;
}

export function disableDesktopNotifications() {
  localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, "0");
}

export const useNotifications = () => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const clientId = session.user.id ?? getOrCreateClientId();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/notifications-get`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId, accessToken: session.access_token }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const list: AppNotification[] = data.notifications ?? [];

      // Fire a real OS notification for anything new since the last poll —
      // only once permission has actually been granted, and never on the
      // very first load (that would re-notify for everything in history
      // the moment the tab opens).
      if (!firstLoad.current && isDesktopNotificationsEnabled() && "Notification" in window && Notification.permission === "granted") {
        for (const n of list) {
          if (!seenIds.current.has(n.id)) {
            new Notification(n.title, { body: n.body ?? undefined });
          }
        }
      }
      seenIds.current = new Set(list.map((n) => n.id));
      firstLoad.current = false;

      setNotifications(list);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Best-effort — the Bell just shows whatever it last had.
    }
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!session?.user?.id || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/notifications-mark-read`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ clientId: session.user.id, accessToken: session.access_token }),
      });
    } catch {
      // Best-effort — worst case it re-shows as unread next refresh.
    }
  }, [session?.user?.id, session?.access_token, unreadCount]);

  return { notifications, unreadCount, refresh, markAllRead };
};
