import React, { useCallback } from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/context/DataContext';
import { FirmRow } from '@/components/FirmRow';
import { BrandRow } from '@/components/BrandRow';
import type { Firm } from '@/context/DataContext';

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leaderboard, isDemo, refresh } = useData();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Refetch server state on focus so web-side edits reach a mounted tab.
  // refresh() is debounced in the provider (in-flight / < 30s skipped), so
  // this is the only focus refetch needed for this screen.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const totalFirms = leaderboard.length;
  // In demo mode the static list pretends to be a slice of the real 92-firm
  // Serbia directory. In live mode show the true count from the peer query.
  const subtitleFirmCount = isDemo ? 92 : totalFirms;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {/* Brand mark — same treatment as the Score tab */}
        <BrandRow />
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Serbia Rankings
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {subtitleFirmCount} firm{subtitleFirmCount !== 1 ? 's' : ''} · Market Visibility Score
        </Text>
      </View>

      <FlatList<Firm>
        data={leaderboard}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FirmRow firm={item} />}
        scrollEnabled={!!leaderboard.length}
        contentContainerStyle={{ paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 84 }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {isDemo
                ? `Showing top ${totalFirms} of 92 firms`
                : `${totalFirms} firm${totalFirms !== 1 ? 's' : ''} · published audits + directory standing`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 24, marginBottom: 4 },
  subtitle: { fontSize: 13 },
  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: { fontSize: 12 },
});
