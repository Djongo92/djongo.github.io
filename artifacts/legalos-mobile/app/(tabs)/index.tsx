import React, { useCallback, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/context/DataContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useAchievements } from '@/hooks/useAchievements';
import { ScoreRing } from '@/components/ScoreRing';
import { CategoryRow } from '@/components/CategoryRow';
import { TodayFocusCards } from '@/components/TodayFocusCards';
import { NetworkInsightsCard } from '@/components/NetworkInsightsCard';
import { ShareCard } from '@/components/ShareCard';
import { NotificationsBell } from '@/components/NotificationsBell';
import { PressableScale } from '@/components/PressableScale';
import { chapters } from '@/data/chapters';
import { computeMeasuredTotals, toScale500 } from '@/lib/measuredScore';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';
import { BrandRow } from '@/components/BrandRow';
import { WARNING } from '@/constants/colors';

// Same amber the score-history chart and leaderboard trust flags use — keep
// the "something needs attention, non-blocking" treatment consistent.
const AMBER = WARNING;

export default function ScoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { firm, leaderboard, categories, isDemo, isLoading, refresh, refreshError, hasNoAudit } = useData();
  const { readCount, doneCount } = useReadingProgress();
  const { badges, earnedCount } = useAchievements({ readCount, doneCount });
  const router = useRouter();
  const [shareVisible, setShareVisible] = useState(false);

  // Refetch server state on focus so web-side edits reach this mounted tab.
  // The provider debounces (in-flight / < 30s skipped) so switching tabs
  // rapidly won't fire duplicate network calls.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const measured = computeMeasuredTotals(categories);
  // Partial-score explanation, composed here (not the shared parity note):
  // states how much of the audit is measured and WHY a category is out, so
  // the asterisk on the ring reads as intentional method, not missing work.
  const measuredCount = categories.filter((c) => c.provenance !== 'missing').length;
  const partialNote = measured.isPartial
    ? `*Scored on ${measuredCount} of ${categories.length} categories — ${measured.excludedLabels.join(', ')} is awaiting its data source, so it's excluded from your total rather than guessed at zero.`
    : null;

  // Points to the next FULL-AUDIT firm above. Directory-standing rows rank
  // alongside on the merged leaderboard but score on a 45-point scale, so a
  // points comparison against one would be apples-to-oranges.
  const firmAboveInRank = leaderboard
    .filter((f) => f.hasFullAudit && f.rank < firm.rank)
    .sort((a, b) => b.rank - a.rank)[0];
  const scoreToNext = firmAboveInRank ? Math.max(0, firmAboveInRank.score - firm.score) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refresh({ force: true })}
            tintColor={colors.primary}
          />
        }
      >
        {/* Non-blocking stale-data banner — a signed-in refresh failed but
            real data is already on screen, so we keep showing it rather than
            wiping the tab. Reuses the card conventions; Retry forces a
            refresh past the debounce. Only for live data (never demo). */}
        {!isDemo && refreshError && (
          <View style={[styles.staleBanner, { backgroundColor: `${AMBER}12`, borderColor: `${AMBER}45` }]}>
            <Feather name="wifi-off" size={15} color={AMBER} />
            <Text style={[styles.staleText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
              Couldn't refresh — showing your last loaded audit.
            </Text>
            <PressableScale
              style={[styles.staleRetry, { borderColor: `${AMBER}55` }]}
              onPress={() => refresh({ force: true })}
            >
              <Text style={[styles.staleRetryText, { color: AMBER, fontFamily: 'Inter_600SemiBold' }]}>
                Retry
              </Text>
            </PressableScale>
          </View>
        )}

        {/* Empty-account nudge — signed-in, load succeeded, but no audit yet.
            Invite completing the firm profile to get a real audit. Never
            inferred from demo mode (hasNoAudit is set only on a successful
            signed-in load with hasAudit === false). */}
        {hasNoAudit && (
          <PressableScale
            style={[styles.connectCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}
            onPress={() => router.push('/firm-profile')}
          >
            <View style={styles.connectLeft}>
              <Feather name="briefcase" size={16} color={colors.primary} />
              <View>
                <Text style={[styles.connectTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  Complete your firm profile
                </Text>
                <Text style={[styles.connectBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Add your firm's details so we can run a real audit and replace this demo score
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </PressableScale>
        )}

        {/* Header row: firm info + share + history */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* Brand mark — shared component so every tab matches */}
            <BrandRow />
            {/* Demo mode gets the amber "attention" treatment and says
                "representative data" outright — realistic numbers must never
                be mistakable for the viewer's own firm. */}
            <View style={[styles.badgePill, { borderColor: isDemo ? `${AMBER}50` : `${colors.primary}40`, backgroundColor: isDemo ? `${AMBER}10` : `${colors.primary}10` }]}>
              <View style={[styles.badgeDot, { backgroundColor: isDemo ? AMBER : colors.primary }]} />
              <Text style={[styles.badgeText, { color: isDemo ? AMBER : colors.primary }]}>
                {isDemo ? 'DEMO · REPRESENTATIVE DATA' : 'LIVE · SERBIA'}
              </Text>
            </View>
            <Text style={[styles.firmName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
              {firm.name}
            </Text>
            <Text style={[styles.domain, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {firm.domain}
            </Text>
            {isDemo && (
              <Text style={[styles.demoCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                A fictional Serbian firm with realistic numbers — not your firm's data.
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            <NotificationsBell />
            <PressableScale
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onPress={() => router.push('/score-history')}
            >
              <Feather name="trending-up" size={16} color={colors.mutedForeground} />
            </PressableScale>
            <PressableScale
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onPress={() => setShareVisible(true)}
            >
              <Feather name="share-2" size={16} color={colors.mutedForeground} />
            </PressableScale>
          </View>
        </View>

        {/* Score ring */}
        <View style={styles.ringContainer}>
          <ScoreRing score={firm.score} percentile={firm.percentile} measuredMax={measured.measuredMax} isPartial={measured.isPartial} />
          {/* One sentence of business meaning — what the number measures and
              against whom, so "246/500" answers "so what?" without a tap. */}
          <Text style={[styles.meaningText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            How easily the clients you want can find, vet, and shortlist your firm online — measured against every scored firm in Serbia.
          </Text>
          {partialNote && (
            <Text style={[styles.measuredNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {partialNote}
            </Text>
          )}
        </View>

        {/* Rank context — one line. The ring already carries the score,
            percentile, and tier, so repeating them here is duplication,
            not emphasis. Taps through to the full leaderboard. */}
        <PressableScale
          style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/leaderboard')}
        >
          <View style={styles.rankLine}>
            <Text style={[styles.rankLineText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              #{firm.rank}{' '}
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                in Serbia{leaderboard.length > 0 ? ` · ${leaderboard.length} firms` : ''}
              </Text>
            </Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
          </View>
          {scoreToNext !== null && (
            <Text style={[styles.nextRankCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', borderTopColor: colors.border }]}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>{toScale500(scoreToNext, measured.measuredMax || 200)} pts</Text> to overtake #{firmAboveInRank?.rank} — one rank closer to the firms clients call first
            </Text>
          )}
        </PressableScale>

        {/* Today's Focus swipeable cards */}
        <TodayFocusCards categories={categories} />

        {/* Battle Plan teaser — the living plan surface has its own screen */}
        <PressableScale
          style={[styles.nudgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/battle-plan')}
        >
          <Feather name="target" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.nudgeTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Your Battle Plan
            </Text>
            <Text style={[styles.nudgeBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              The moves that turn these gaps into won mandates — see what's armed
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </PressableScale>

        {/* Network Insights — anonymised peer benchmarks (signed-in only),
            placed after the primary insights like the web CommandCenter */}
        <NetworkInsightsCard />

        {/* Category breakdown — each row is tappable */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            SCORE BREAKDOWN
          </Text>
          {/* Rows are read-only here — a press that only fires a haptic is
              a fake affordance, so there's no tappable wrapper. */}
          {categories.map((cat, i) => (
            <CategoryRow key={cat.key} category={cat} index={i} />
          ))}
        </View>

        {/* Achievements */}
        {earnedCount > 0 && (
          <View style={[styles.achievementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              ACHIEVEMENTS
            </Text>
            <View style={styles.badgesWrap}>
              {badges.map(badge => (
                <View
                  key={badge.id}
                  style={[
                    styles.achieveBadge,
                    {
                      backgroundColor: badge.earned ? `${colors.primary}15` : 'transparent',
                      borderColor: badge.earned ? `${colors.primary}40` : colors.border,
                      opacity: badge.earned ? 1 : 0.4,
                    },
                  ]}
                >
                  <Feather
                    name={badge.icon as keyof typeof Feather.glyphMap}
                    size={14}
                    color={badge.earned ? colors.primary : colors.mutedForeground}
                  />
                  <View>
                    <Text
                      style={[
                        styles.achieveLabel,
                        { color: badge.earned ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' },
                      ]}
                    >
                      {badge.label}
                    </Text>
                    <Text style={[styles.achieveDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {badge.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={[styles.achieveProgress, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {earnedCount}/{badges.length} earned · Read chapters to unlock more
            </Text>
          </View>
        )}

        {/* Guidebook nudge if no achievements yet */}
        {earnedCount === 0 && (
          <PressableScale
            style={[styles.nudgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/guidebook')}
          >
            <Feather name="book-open" size={16} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nudgeTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                Start the Guidebook
              </Text>
              <Text style={[styles.nudgeBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {readCount}/{chapters.length} chapters read · Earn your first achievement
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </PressableScale>
        )}

        {/* Connect account CTA (demo mode only) */}
        {isDemo && (
          <PressableScale
            style={[styles.connectCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <View style={styles.connectLeft}>
              <Feather name="lock" size={16} color={colors.primary} />
              <View>
                <Text style={[styles.connectTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  See your firm's real position
                </Text>
                <Text style={[styles.connectBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Replace this representative demo with a live audit of your firm — and exactly what to fix to win more of the work you want
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </PressableScale>
        )}
      </ScrollView>

      {/* Share card modal */}
      <ShareCard firm={firm} visible={shareVisible} onClose={() => setShareVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  // Header
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  headerLeft: { flex: 1, gap: 2 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  firmName: { fontSize: 22, letterSpacing: -0.3 },
  // Data string (the firm's domain), not a label — keeps its own subtle
  // tracking; the eyebrow tokens are for uppercase micro-labels, not data.
  domain: { fontSize: 12, letterSpacing: 0.2 },
  // Demo-only caption under the domain — plain sentence voice, not a label.
  demoCaption: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ring
  ringContainer: { alignItems: 'center', marginVertical: 24 },
  // Business-meaning line — sits directly under the ring, before any caveat.
  meaningText: { fontSize: 12, textAlign: 'center', marginTop: 14, paddingHorizontal: 16, lineHeight: 17 },
  measuredNote: { fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 24, lineHeight: 15 },
  // Rank
  rankCard: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  rankLine: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rankLineText: { fontSize: 16, letterSpacing: -0.2 },
  nextRankCaption: { fontSize: 12, textAlign: 'center', paddingVertical: 10, borderTopWidth: 1 },
  // Cards
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginBottom: 4 },
  // Achievements
  achievementsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  badgesWrap: { gap: 8 },
  achieveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  achieveLabel: { fontSize: 13 },
  achieveDesc: { fontSize: 11 },
  achieveProgress: { fontSize: 11, textAlign: 'center' },
  // Nudge
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  nudgeTitle: { fontSize: 14 },
  nudgeBody: { fontSize: 12, marginTop: 2 },
  // Stale-data banner (non-blocking refresh failure)
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  staleText: { flex: 1, fontSize: 12, lineHeight: 16 },
  staleRetry: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  staleRetryText: { fontSize: 12 },
  // Connect CTA
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  connectLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  connectTitle: { fontSize: 14 },
  connectBody: { fontSize: 12, marginTop: 2, lineHeight: 17 },
});
