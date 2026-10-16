// Bell + inbox for the Score tab header. Signed-out (demo) users have no
// real notifications, so the bell renders nothing — gating on auth identity,
// per the demo-gating rule. Opening the inbox marks everything read.
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/hooks/useNotifications';

function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationsBell() {
  const { session } = useAuth();
  const colors = useColors();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  // The modal is owned by the identity that opened it — render-time check,
  // same invariant as the hook (an effect would leak one frame).
  const [openedBy, setOpenedBy] = useState<string | null>(null);
  const userId = session?.user?.id ?? null;
  const open = openedBy !== null && openedBy === userId;

  // Demo mode has no identity — no bell, not even an empty one.
  if (!userId) return null;

  const openInbox = () => {
    setOpenedBy(userId);
    markAllRead();
  };
  const closeInbox = () => setOpenedBy(null);

  return (
    <>
      <Pressable
        style={[styles.iconBtn, { borderColor: colors.border }]}
        onPress={openInbox}
        accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Feather name="bell" size={16} color={unreadCount > 0 ? colors.primary : colors.mutedForeground} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeInbox}>
        <Pressable style={styles.backdrop} onPress={closeInbox}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Notifications
              </Text>
              <Pressable onPress={closeInbox} accessibilityLabel="Close notifications">
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.id}
              style={styles.list}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Nothing yet — your weekly score digest lands here every Monday.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.row, { borderBottomColor: colors.border }]}>
                  <View style={[styles.dot, { backgroundColor: item.read_at ? colors.border : colors.primary }]} />
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {item.title}
                    </Text>
                    {!!item.body && (
                      <Text style={[styles.rowText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {item.body}
                      </Text>
                    )}
                    <Text style={[styles.rowWhen, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {formatWhen(item.created_at)}
                    </Text>
                  </View>
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(4,10,24,0.72)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 14, borderWidth: 1, maxHeight: '72%', overflow: 'hidden' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 15 },
  list: { flexGrow: 0 },
  empty: { padding: 24, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13 },
  rowText: { fontSize: 12, lineHeight: 17 },
  rowWhen: { fontSize: 10, marginTop: 2 },
});
