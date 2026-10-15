import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/context/DataContext';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { chapters } from '@/data/chapters';
import { computeMeasuredTotals, measuredScoreLabel, toScale500 } from '@/lib/measuredScore';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING, EYEBROW_TRACKING } from '@/constants/typography';
import { BrandRow } from '@/components/BrandRow';

const HOUR = new Date().getHours();
const GREETING =
  HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';

interface ActionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: boolean;
  /** Desktop-only features render dimmed with a badge instead of linking
   *  out — the workshop tab sets the precedent (no fake URLs, no dead ends). */
  desktopOnly?: boolean;
  colors: ReturnType<typeof useColors>;
}

function ActionCard({ icon, title, subtitle, onPress, accent, desktopOnly, colors }: ActionCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={desktopOnly}
      style={[
        styles.actionCard,
        {
          backgroundColor: accent ? `${colors.primary}10` : colors.card,
          borderColor: accent ? `${colors.primary}35` : colors.border,
        },
        desktopOnly && { opacity: 0.55 },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: accent ? `${colors.primary}20` : `${colors.primary}10` }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {title}
        </Text>
        <Text style={[styles.actionSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {subtitle}
        </Text>
      </View>
      {desktopOnly ? (
        <Text style={[styles.desktopBadge, { color: colors.mutedForeground, borderColor: colors.border }]}>
          DESKTOP
        </Text>
      ) : (
        <Feather name="chevron-right" size={16} color={accent ? colors.primary : colors.mutedForeground} />
      )}
    </PressableScale>
  );
}

export default function BriefScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { firm, categories, refresh } = useData();
  const { readCount, doneCount } = useReadingProgress();
  const router = useRouter();

  // Refetch server state on focus so web-side edits reach this mounted tab
  // (debounced in the provider — in-flight / < 30s skipped).
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const measured = useMemo(() => computeMeasuredTotals(categories), [categories]);

  // Categories the audit could actually measure — a "missing" category
  // (e.g. no SEO data source configured) has a nominal 0/max that would
  // otherwise look like the single biggest, most "actionable" gap, when
  // in fact it was never scored at all.
  const measuredCategories = useMemo(
    () => categories.filter(cat => cat.provenance !== 'missing'),
    [categories],
  );

  // Top opportunity (weakest category by % completion), excluding anything unmeasured.
  const topOpportunity = useMemo(() => {
    return [...measuredCategories]
      .map(cat => ({ ...cat, pct: cat.score / cat.max }))
      .sort((a, b) => a.pct - b.pct)[0];
  }, [measuredCategories]);

  // Next unread chapter
  const nextUnread = useMemo(() => {
    return chapters.find(ch => {
      // readChapters is loaded async; we use readCount as proxy
      return true; // will show first chapter always as a nudge
    });
  }, []);

  // What-If: top 3 measured categories sorted by potential gain
  const whatIfItems = useMemo(() => {
    return [...measuredCategories]
      .map(cat => ({ ...cat, gap: cat.max - cat.score }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
  }, [measuredCategories]);

  const totalPotential = whatIfItems.reduce((sum, c) => sum + c.gap, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark — same treatment as the Score tab */}
        <BrandRow />

        {/* Greeting */}
        <View style={[styles.greetingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.greetingTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {GREETING}
              </Text>
              <Text style={[styles.firmName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                {firm.name}
              </Text>
            </View>
            <View style={[styles.scorePill, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
              <Text style={[styles.scoreNum, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                {toScale500(firm.score, measured.measuredMax || 200)}
              </Text>
              <Text style={[styles.scoreMax, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                /500{measured.isPartial ? '*' : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.greetingDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.greetingBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Ranked <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>#{firm.rank}</Text> in Serbia.{' '}
            {readCount > 0
              ? `${readCount} chapters read, ${doneCount} actions done.`
              : 'Start the Guidebook to build your strategy.'}
          </Text>
        </View>

        {/* Top Opportunity */}
        <View style={[styles.opportunityCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
          <View style={styles.oppHeader}>
            <Feather name="target" size={14} color={colors.primary} />
            <Text style={[styles.oppLabel, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              TOP OPPORTUNITY
            </Text>
          </View>
          <Text style={[styles.oppTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {topOpportunity?.label}
          </Text>
          <Text style={[styles.oppBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Your weakest category at{' '}
            <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold' }}>
              {topOpportunity ? Math.round((topOpportunity.score / topOpportunity.max) * 100) : 0}% of its potential
            </Text>
            . Improving it creates the highest impact on your rank.
          </Text>
        </View>

        {/* What-If Simulator */}
        <View style={[styles.whatIfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.whatIfHeader}>
            <Feather name="trending-up" size={14} color={colors.primary} />
            <Text style={[styles.whatIfLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              WHAT IF YOU MAXED YOUR TOP GAPS?
            </Text>
          </View>
          <View style={styles.whatIfItems}>
            {whatIfItems.map(cat => (
              <View key={cat.key} style={styles.whatIfRow}>
                <View style={styles.whatIfLeft}>
                  <View style={[styles.whatIfDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.whatIfCat, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                    {cat.label}
                  </Text>
                </View>
                <Text style={[styles.whatIfGap, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {Math.round((cat.score / cat.max) * 100)}%
                </Text>
                <View style={[styles.whatIfGainPill, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.whatIfGain, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                    +{Math.round(cat.gap * 2.5)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.whatIfTotal, { borderTopColor: colors.border }]}>
            <Text style={[styles.whatIfTotalLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Maximum potential gain
            </Text>
            <Text style={[styles.whatIfTotalNum, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              +{Math.round(totalPotential * 2.5)} pts
            </Text>
          </View>
          <Text style={[styles.whatIfNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            From {toScale500(firm.score, measured.measuredMax || 200)} → {toScale500(firm.score + totalPotential, measured.measuredMax || 200)}/500{measured.isPartial ? '*' : ''}
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.actionsHeader, { color: colors.mutedForeground }]}>
          QUICK ACTIONS
        </Text>
        <View style={styles.actionsStack}>
          <ActionCard
            colors={colors}
            icon="book-open"
            title="Continue Guidebook"
            subtitle={readCount === 0 ? 'Start Chapter 1 — Event Marketing' : `Chapter ${readCount + 1} of ${chapters.length}`}
            onPress={() => {
              const ch = chapters[Math.min(readCount, chapters.length - 1)];
              if (ch) router.push(`/chapter/${ch.id}`);
            }}
            accent
          />
          <ActionCard
            colors={colors}
            icon="tool"
            title="Open AI Workshop"
            subtitle="11 tools for legal marketing execution"
            onPress={() => router.push('/workshop')}
          />
          <ActionCard
            colors={colors}
            icon="award"
            title="View Full Rankings"
            subtitle={`You're #${firm.rank} of 92 firms in Serbia`}
            onPress={() => router.push('/leaderboard')}
          />
          <ActionCard
            colors={colors}
            icon="briefcase"
            title="Firm Profile"
            subtitle="Practice, size & goal — tailors every AI tool"
            onPress={() => router.push('/firm-profile')}
          />
          <ActionCard
            colors={colors}
            icon="download"
            title="Export Battle Plan PDF"
            subtitle="Generate your boardroom report in the web app"
            desktopOnly
            onPress={() => {}}
          />
        </View>

        {/* Battle Plan CTA */}
        <View style={[styles.battlePlanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.battlePlanTop}>
            <View style={[styles.battlePlanIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Feather name="file-text" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.battlePlanTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Your Battle Plan
              </Text>
              <Text style={[styles.battlePlanSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                500-point audit → boardroom-ready PDF
              </Text>
            </View>
          </View>
          <View style={styles.battlePlanSections}>
            {[
              'Executive score summary with benchmarks',
              'Category-by-category gap analysis',
              '90-day prioritised action roadmap',
              'Competitor positioning matrix',
              'Firm maturity index',
            ].map((s, i) => (
              <View key={i} style={styles.battlePlanRow}>
                <Feather name="check" size={11} color={colors.primary} />
                <Text style={[styles.battlePlanItem, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
          <PressableScale
            disabled
            style={[styles.battlePlanBtn, { backgroundColor: colors.primary, opacity: 0.55 }]}
          >
            <Feather name="download" size={14} color={colors.primaryForeground} />
            <Text style={[styles.battlePlanBtnText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
              Generate Battle Plan
            </Text>
          </PressableScale>
          <Text style={[styles.battlePlanNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Desktop only — generate it free in the web app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  // Greeting
  greetingCard: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12 },
  greetingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 12, marginBottom: 2 },
  firmName: { fontSize: 18, letterSpacing: -0.3 },
  scorePill: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, flexDirection: 'row', gap: 2 },
  scoreNum: { fontSize: 22, lineHeight: 28 },
  scoreMax: { fontSize: 13, alignSelf: 'flex-end', paddingBottom: 2 },
  greetingDivider: { height: 1, marginBottom: 12 },
  greetingBody: { fontSize: 13, lineHeight: 19 },
  // Opportunity
  opportunityCard: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12, gap: 6 },
  oppHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  oppLabel: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  oppTitle: { fontSize: 18, letterSpacing: -0.3 },
  oppBody: { fontSize: 13, lineHeight: 19 },
  // What-If
  whatIfCard: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  whatIfHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  whatIfLabel: { fontSize: 10, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  whatIfItems: { gap: 8, marginBottom: 12 },
  whatIfRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whatIfLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  whatIfDot: { width: 8, height: 8, borderRadius: 4 },
  whatIfCat: { fontSize: 13 },
  whatIfGap: { fontSize: 12, width: 48, textAlign: 'right' },
  whatIfGainPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, minWidth: 40, alignItems: 'center' },
  whatIfGain: { fontSize: 12 },
  whatIfTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  whatIfTotalLabel: { fontSize: 12 },
  whatIfTotalNum: { fontSize: 20 },
  whatIfNote: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  // Actions
  actionsHeader: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginBottom: 10, paddingHorizontal: 4 },
  actionsStack: { gap: 8, marginBottom: 16 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8, borderWidth: 1 },
  actionIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionTitle: { fontSize: 14 },
  actionSubtitle: { fontSize: 12, marginTop: 1 },
  desktopBadge: {
    fontSize: 9, letterSpacing: 1.2, borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden',
  },
  // Battle Plan
  battlePlanCard: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 12 },
  battlePlanTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  battlePlanIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  battlePlanTitle: { fontSize: 16 },
  battlePlanSub: { fontSize: 12, marginTop: 1 },
  battlePlanSections: { gap: 6, marginBottom: 16 },
  battlePlanRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  battlePlanItem: { flex: 1, fontSize: 12, lineHeight: 18 },
  battlePlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 6 },
  battlePlanBtnText: { fontSize: 14 },
  battlePlanNote: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
