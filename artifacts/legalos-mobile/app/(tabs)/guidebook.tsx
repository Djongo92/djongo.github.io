import React from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useAchievements } from '@/hooks/useAchievements';
import { chapters } from '@/data/chapters';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING, EYEBROW_TRACKING } from '@/constants/typography';
import { SUCCESS, GOLD_DEEP, INFO } from '@/constants/colors';
import { BrandRow } from '@/components/BrandRow';
import { PressableScale } from '@/components/PressableScale';

const PRIORITY_COLOR: Record<string, string> = {
  'quick-win': SUCCESS,
  strategic: GOLD_DEEP,
  'long-term': INFO,
};

export default function GuidebookScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readChapters, readCount, doneCount } = useReadingProgress();
  const { badges, earnedCount } = useAchievements({ readCount, doneCount });
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const earned = badges.filter(b => b.earned);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={chapters}
        keyExtractor={ch => ch.id}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Brand mark — same treatment as the Score tab */}
            <View style={{ paddingHorizontal: 4 }}>
              <BrandRow />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Guidebook
              </Text>
              <Text style={[styles.progressText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                {readCount}/{chapters.length}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(readCount / chapters.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {/* Achievements strip */}
            {earned.length > 0 && (
              <View style={styles.badgesRow}>
                {earned.map(badge => (
                  <View
                    key={badge.id}
                    style={[styles.badge, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}
                  >
                    <Feather name={badge.icon as keyof typeof Feather.glyphMap} size={10} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                      {badge.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Section label */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {readCount === 0 ? 'START READING' : readCount < chapters.length ? 'IN PROGRESS' : 'COMPLETE'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isRead = readChapters.has(item.id);
          return (
            <PressableScale
              onPress={() => router.push(`/chapter/${item.id}`)}
              style={[
                styles.chapterRow,
                {
                  backgroundColor: colors.card,
                  borderColor: isRead ? `${colors.primary}40` : colors.border,
                  borderLeftColor: isRead ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chapterNum,
                  { color: isRead ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_700Bold' },
                ]}
              >
                {String(item.number).padStart(2, '0')}
              </Text>

              <View style={styles.chapterContent}>
                <Text
                  style={[styles.chapterTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.chapterHook, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
                  numberOfLines={2}
                >
                  {item.hook}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {item.actionItems.length} actions
                  </Text>
                  <View style={styles.priorityDots}>
                    {item.actionItems.slice(0, 3).map((a, i) => (
                      <View
                        key={i}
                        style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[a.priority] ?? colors.border }]}
                      />
                    ))}
                  </View>
                  {isRead && (
                    <View style={[styles.readPill, { backgroundColor: `${colors.primary}15` }]}>
                      <Feather name="check" size={9} color={colors.primary} />
                      <Text style={[styles.readPillText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                        Read
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </PressableScale>
          );
        }}
        ListFooterComponent={
          readCount === chapters.length ? (
            <View style={[styles.completeBanner, { borderColor: `${colors.primary}30`, backgroundColor: `${colors.primary}08` }]}>
              <Feather name="award" size={18} color={colors.primary} />
              <Text style={[styles.completeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                All 14 chapters complete. Scholar badge earned.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, letterSpacing: -0.5 },
  progressText: { fontSize: 13 },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginBottom: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 1 },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  // Pill micro-label — eyebrow voice (tight variant, matching the other
  // compact badges in TodayFocusCards; the import already exists).
  badgeText: { fontSize: 10, letterSpacing: EYEBROW_TIGHT_TRACKING },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: EYEBROW_TRACKING,
    fontFamily: EYEBROW_FONT_FAMILY,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 12,
  },
  chapterNum: { fontSize: 11, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, width: 24 },
  chapterContent: { flex: 1, gap: 3 },
  chapterTitle: { fontSize: 14, lineHeight: 20 },
  chapterHook: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  metaText: { fontSize: 11 },
  priorityDots: { flexDirection: 'row', gap: 3 },
  priorityDot: { width: 5, height: 5, borderRadius: 2.5 },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  readPillText: { fontSize: 10 },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  completeText: { fontSize: 13, flex: 1 },
});
