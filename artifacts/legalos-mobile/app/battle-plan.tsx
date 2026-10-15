/**
 * Battle Plan screen — the mobile home of the web app's living plan surface.
 *
 * Shows the same seven sections, completion state, badges, and staleness
 * nudges as the web Battle Plan page, read from the same account-synced
 * server state (see useBattlePlanSlots). CTAs route to the mobile equivalent
 * where one exists (Headline Lab, Bio Rewriter, the Score tab) and are
 * labelled honestly as web-only where it doesn't.
 */
import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { toScale500 } from '@/lib/measuredScore';
import { useBattlePlanSlots } from '@/hooks/useBattlePlanSlots';
import {
  BADGE_DEFS,
  buildSteps,
  earnedBadgeIds,
  isStale,
  planTotals,
  timeAgo,
  type BattlePlanSlots,
  type BattlePlanStep,
  type StepKey,
} from '@/lib/battlePlanModel';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

/* ------------------------------------------------------------------ */
/* Plan-strength ring — compact cousin of the Score tab's ScoreRing.   */
/* ------------------------------------------------------------------ */

const RING_SIZE = 132;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function PlanRing({ done, total }: { done: number; total: number }) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      200,
      withSpring(total === 0 ? 0 : done / total, {
        mass: 1,
        damping: 22,
        stiffness: 90,
        overshootClamping: true,
      }),
    );
  }, [done, total, progress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress.value))),
  }));

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.secondary}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.primary}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animatedProps={arcProps}
        />
      </Svg>
      <Text style={{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.5 }}>
        {done}
        <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Inter_500Medium' }}> of {total}</Text>
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 9, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginTop: 2 }}>
        ARMED
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* CTAs — mobile equivalents where they exist, honest label otherwise. */
/* ------------------------------------------------------------------ */

type Cta =
  | { kind: 'route'; label: string; path: string }
  | { kind: 'web-only' };

function ctaFor(key: StepKey, done: boolean): Cta {
  switch (key) {
    case 'headline':
      return { kind: 'route', label: done ? 'Open Headline Lab' : 'Run Headline Lab', path: '/tool/headlines' };
    case 'bio':
      return { kind: 'route', label: done ? 'Open Bio Rewriter' : 'Run Bio Rewriter', path: '/tool/bio-rewriter' };
    case 'visibilityScore':
      return { kind: 'route', label: 'View your score', path: '/(tabs)' };
    // Roast, competitor analysis, the roadmap generator, and the maturity
    // assessment only exist in the web app today — say so rather than
    // dropping the user somewhere unhelpful.
    default:
      return { kind: 'web-only' };
  }
}

/* ------------------------------------------------------------------ */
/* Per-slot previews — trimmed renderers for the web-written payloads. */
/* ------------------------------------------------------------------ */

function stripMarkdown(md: string): string {
  return md.replace(/^#+\s*/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
}

function SlotPreview({ slots, stepKey, colors }: { slots: BattlePlanSlots; stepKey: StepKey; colors: ReturnType<typeof useColors> }) {
  const body = { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' as const, fontSize: 12, lineHeight: 17 };
  const strong = { color: colors.foreground, fontFamily: 'Inter_600SemiBold' as const };

  switch (stepKey) {
    case 'roast': {
      const r = slots.roast;
      if (!r) return null;
      return (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.gradePill, { borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}12` }]}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 16 }}>{r.grade}</Text>
            </View>
            <Text style={[body, { flex: 1 }]} numberOfLines={3}>{r.verdict}</Text>
          </View>
          <Text style={body}>
            <Text style={strong}>{r.topThreeFixes.length} fixes</Text> that matter most, ranked.
          </Text>
        </View>
      );
    }
    case 'competitor': {
      const c = slots.competitor;
      if (!c) return null;
      return (
        <View style={{ gap: 6 }}>
          <Text style={body} numberOfLines={3}>{c.executiveSummary}</Text>
          <Text style={body}>
            <Text style={strong}>{c.recommendedMoves.length} recommended moves</Text>, ranked by impact.
          </Text>
        </View>
      );
    }
    case 'roadmap': {
      const r = slots.roadmap;
      if (!r) return null;
      const moves = r.phases.reduce((n, p) => n + p.actions.length, 0);
      return (
        <View style={{ gap: 6 }}>
          <Text style={body} numberOfLines={3}>{r.summary}</Text>
          <Text style={body}>
            <Text style={strong}>{r.phases.map((p) => p.label).join(' · ')}</Text>
            {` — ${moves} moves.`}
          </Text>
        </View>
      );
    }
    case 'visibilityScore': {
      const v = slots.visibilityScore;
      if (!v) return null;
      return (
        <Text style={body}>
          <Text style={{ ...strong, fontSize: 16 }}>{toScale500(v.totalScore, 500)} pts</Text>
          {v.percentile !== null ? ` · Top ${v.percentile}%` : ''}
          {` of ${v.peerCount} firms`}
        </Text>
      );
    }
    case 'maturity': {
      const m = slots.maturity;
      if (!m) return null;
      return (
        <View style={{ gap: 8 }}>
          <Text style={body}>
            <Text style={{ ...strong, fontSize: 16 }}>{m.score}/100</Text> overall
          </Text>
          {m.dimensions.slice(0, 4).map((d) => (
            <View key={d.label} style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...body, fontSize: 11 }}>{d.label}</Text>
                <Text style={{ ...body, fontSize: 11 }}>{d.score}</Text>
              </View>
              <View style={[styles.dimTrack, { backgroundColor: colors.secondary }]}>
                <View style={[styles.dimFill, { backgroundColor: colors.primary, width: `${Math.min(100, Math.max(0, d.score))}%` }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'headline': {
      const h = slots.headline;
      if (!h) return null;
      return (
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            “{h.text}”
          </Text>
          <Text style={body}>{h.angle}</Text>
        </View>
      );
    }
    case 'bio': {
      const b = slots.bio;
      if (!b) return null;
      return (
        <Text style={body} numberOfLines={3}>{stripMarkdown(b.rewrite)}</Text>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

export default function BattlePlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slots, loading, refresh, isDemo, signedIn } = useBattlePlanSlots();

  const steps = buildSteps(slots);
  const totals = planTotals(steps);
  const badges = earnedBadgeIds(slots);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderCard = (step: BattlePlanStep) => {
    const stale = step.done && isStale(step.capturedAt);
    const cta = ctaFor(step.key, step.done);
    return (
      <View key={step.key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, flexShrink: 1 }}>
                {step.label}
              </Text>
              {step.core && (
                <View style={[styles.coreChip, { borderColor: `${colors.primary}40` }]}>
                  <Text style={{ color: colors.primary, fontSize: 8, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY }}>CORE</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
              {step.done && step.capturedAt ? `Captured ${timeAgo(step.capturedAt)}` : 'Not captured yet'}
            </Text>
          </View>
          <Feather
            name={step.done ? 'check-circle' : 'circle'}
            size={18}
            color={step.done ? colors.primary : colors.mutedForeground}
          />
        </View>

        {step.done ? (
          <SlotPreview slots={slots} stepKey={step.key} colors={colors} />
        ) : (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 }}>
            {step.adds}
          </Text>
        )}

        <View style={styles.cardFooter}>
          {stale && (
            <View style={[styles.staleChip, { borderColor: '#C49C3640', backgroundColor: '#C49C3612' }]}>
              <Feather name="clock" size={10} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_500Medium' }}>
                This intel has aged — rerun it
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {cta.kind === 'route' ? (
            <Pressable
              style={[styles.ctaBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
              onPress={() => { haptic(); router.push(cta.path as never); }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                {stale ? 'Rerun' : cta.label}
              </Text>
              <Feather name="arrow-right" size={12} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={[styles.webOnlyChip, { borderColor: colors.border }]}>
              <Feather name="monitor" size={10} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: 'Inter_500Medium' }}>
                Run it in the web app
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Battle Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Hero — plan strength + badges */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <PlanRing done={totals.done} total={totals.total} />
          <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 16, marginTop: 12 }}>
            Plan strength
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, textAlign: 'center' }}>
            Core intel: {totals.coreDone} of {totals.coreTotal} · Bonus sections: {totals.done - totals.coreDone} of {totals.total - totals.coreTotal}
          </Text>

          <View style={styles.badgeRow}>
            {BADGE_DEFS.map((b) => {
              const earned = badges.has(b.id);
              return (
                <View
                  key={b.id}
                  style={[
                    styles.badge,
                    earned
                      ? { borderColor: `${colors.primary}60`, backgroundColor: `${colors.primary}12` }
                      : { borderColor: colors.border, backgroundColor: 'transparent' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Feather name={earned ? 'award' : 'lock'} size={11} color={earned ? colors.primary : colors.mutedForeground} />
                    <Text style={{
                      color: earned ? colors.primary : colors.mutedForeground,
                      fontSize: 10,
                      fontFamily: 'Inter_600SemiBold',
                    }}>
                      {b.label}
                    </Text>
                  </View>
                  {!earned && (
                    <Text style={{ color: colors.mutedForeground, fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 3 }}>
                      {b.requirement}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Demo / sign-in context */}
        {isDemo ? (
          <Text style={[styles.syncNote, { color: colors.mutedForeground }]}>
            Demo plan — sign in to see your real one, synced with the web app.
          </Text>
        ) : !signedIn ? (
          <Pressable onPress={() => { haptic(); router.push('/(auth)/sign-in'); }}>
            <Text style={[styles.syncNote, { color: colors.primary }]}>
              Sign in to sync the battle plan you built on the web →
            </Text>
          </Pressable>
        ) : null}

        {/* The seven sections */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>THE INTEL</Text>
        {steps.map(renderCard)}

        <Text style={[styles.syncNote, { color: colors.mutedForeground, marginTop: 8 }]}>
          Runs from the web app appear here automatically through your account. PDF export lives on the web's Battle Plan page.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: '44%',
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: EYEBROW_TRACKING,
    fontFamily: EYEBROW_FONT_FAMILY,
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  coreChip: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  staleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  webOnlyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  gradePill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dimTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  dimFill: { height: 4, borderRadius: 2 },
  syncNote: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 6,
    paddingHorizontal: 8,
  },
});
