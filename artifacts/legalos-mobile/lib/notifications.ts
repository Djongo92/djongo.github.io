// Real notification inbox for a signed-in account — the mobile port of the
// web useNotifications hook. This is where the weekly score digest lands on
// mobile. Anonymous/demo use never calls these (no session token to resolve
// a real identity from), matching every other real-account-only feature.
import { callFunction } from './supabase';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
}

/** identity comes from the verified accessToken, never the caller-asserted
 *  clientId alone — same contract as the web hook. */
export async function fetchNotifications(clientId: string, accessToken: string): Promise<NotificationsResult> {
  const data = await callFunction<{ notifications?: AppNotification[]; unreadCount?: number }>(
    'notifications-get',
    { clientId, accessToken },
  );
  return { notifications: data.notifications ?? [], unreadCount: data.unreadCount ?? 0 };
}

export async function markAllNotificationsRead(clientId: string, accessToken: string): Promise<void> {
  await callFunction('notifications-mark-read', { clientId, accessToken });
}
