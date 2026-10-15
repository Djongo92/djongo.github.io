/**
 * Score history screen — sparkline chart + audit log.
 *
 * Shows the firm's score trend over time. When live data is available (authenticated
 * user), it uses real `auditHistory` from DataContext. In demo mode it shows a
 * realistic simulated trend to demonstrate the UI.
 *
 * Trust signals mirror the web score-history chart: each point carries the
 * frozen raw metrics behind its scores (the audit log's evidence line), and
 * a snapshot recorded on a thin peer sample (confidenceScore < 1) is flagged
 * with a hollow amber dot + "thin-sampled" badge rather than reading as a
 * real dip. A category that scored "missing" never shows a fabricated raw
 * value (provenance gate, same rule as web).
 */
import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useData, type AuditHistoryEntry, type Provenance } from '@/context/DataContext';
import { historyRowDisplay, isThinSampledPoint } from '@/lib/trendMetrics';
import { computeMeasuredTotals, historyScore500, toScale500 } from '@/lib/measuredScore';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';
import { WARNING } from '@/constants/colors';
import { BrandRow } from '@/components/BrandRow';

const AMBER = WARNING;

// Demo history shown when the user isn't authenticated. Carries the same
// fields as a real snapshot — a fixture missing them would read as "feature
// broken" in demo mode. seoAuthority is deliberately "missing" (matching
// DEMO_FIRM) and the oldest point is thin-sampled so both trust treatments
// are visible in demo too.
const DEMO_PROVENANCE: Provenance = {
  performance: 'api', social: 'api', seoAuthority: 'missing', thoughtLeadership: 'api', reputation: 'api',
};

const demoRaw = (perfAvg: number, followers: number, posts: number, gbpRating: number) => ({
  performance: { desktop: { performance: perfAvg + 4 }, mobile: { performance: perfAvg - 4 }, perfAvg },
  social: { followers },
  thoughtLeadership: { postsCount: posts },
  reputation: { gbpRating, gbpListed: true },
});

const DEMO_HISTORY: AuditHistoryEntry[] = [
  { score: 78,  recordedAt: '2025-10-01', rawMetrics: demoRaw(58, 820, 1, 3.9),   provenance: DEMO_PROVENANCE, confidenceScore: 0.6, sampleSize: 3 },
  { score: 82,  recordedAt: '2025-11-01', rawMetrics: demoRaw(61, 940, 2, 4.0),   provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 12 },
  { score: 88,  recordedAt: '2025-12-01', rawMetrics: demoRaw(64, 1050, 2, 4.1),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 12 },
  { score: 91,  recordedAt: '2026-01-01', rawMetrics: demoRaw(66, 1180, 3, 4.2),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 14 },
  { score: 97,  recordedAt: '2026-02-01', rawMetrics: demoRaw(69, 1320, 3, 4.3),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 14 },
  { score: 103, recordedAt: '2026-03-01', rawMetrics: demoRaw(72, 1490, 4, 4.4),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 16 },
  { score: 108, recordedAt: '2026-04-01', rawMetrics: demoRaw(75, 1660, 4, 4.5),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 16 },
  { score: 113, recordedAt: '2026-05-01', rawMetrics: demoRaw(78, 1850, 5, 4.6),  provenance: DEMO_PROVENANCE, confidenceScore: 1, sampleSize: 18 },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function Sparkline({ data, color, dotFill }: { data: AuditHistoryEntry[]; color: string; dotFill: string }) {
  if (data.length < 2) return null;
  const W = 320;
  const H = 120;
  const PAD = 16;
  const w = W - PAD * 2;
  const h = H - PAD * 2;

  // Plot the 500-scale values (each snapshot rescaled against what IT
  // measured), not raw scores — with a provenance denominator change, raw
  // points can rise while the displayed values fall (70/140→250, then
  // 80/200→200), contradicting the audit log and summary delta.
  const scores = data.map(d => historyScore500(d.score, d.provenance, d.methodologyVersion));
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;
  const range = maxS - minS || 1;

  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * w,
    y: PAD + (1 - (scores[i] - minS) / range) * h,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </SvgLinearGradient>
      </Defs>
      {/* Area fill */}
      <Path d={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points — a hollow amber ring flags a point recorded when the
          peer-normalized metrics were thin-sampled (confidenceScore < 1),
          without changing the line itself (mirrors the web chart). */}
      {pts.map((p, i) => {
        const thin = isThinSampledPoint(data[i]);
        return (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === pts.length - 1 ? 5 : 3}
            fill={thin ? dotFill : color}
            stroke={thin ? AMBER : 'none'}
            strokeWidth={thin ? 2 : 0}
          />
        );
      })}
    </Svg>
  );
}

export default function ScoreHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { firm, auditHistory, isDemo, refresh } = useData();

  // Refetch server state on focus so a fresh audit reaches this screen
  // (debounced in the provider — in-flight / < 30s skipped).
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const history = auditHistory.length > 0 ? auditHistory : DEMO_HISTORY;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Deltas subtract the SCALED endpoints (each snapshot rescaled against
  // what it measured via its frozen provenance) — scaling the raw
  // difference instead drifts from the displayed values by rounding.
  const delta = history.length >= 2
    ? historyScore500(history[history.length - 1].score, history[history.length - 1].provenance, history[history.length - 1].methodologyVersion)
      - historyScore500(history[0].score, history[0].provenance, history[0].methodologyVersion)
    : 0;

  const { categories } = useData();
  const measured = computeMeasuredTotals(categories);
  const current500 = toScale500(firm.score, measured.measuredMax || 500);

  const anyThinSampled = history.some(isThinSampledPoint);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        {/* Brand mark — shared component so the detail screen carries the same
            treatment as every tab header. */}
        <BrandRow style={styles.headerBrand} />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Score History</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {isDemo && (
          <View style={[styles.demoBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.demoText, { color: colors.mutedForeground }]}>
              Demo data — sign in to see your real trend
            </Text>
          </View>
        )}

        {/* Summary stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{current500}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Current / 500</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: delta >= 0 ? '#4BAF8A' : '#ef4444' }]}>
              {delta >= 0 ? '+' : ''}{delta}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Since {formatDate(history[0].recordedAt)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{history.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Audits</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>SCORE OVER TIME</Text>
            {anyThinSampled && (
              <Text style={[styles.thinBadge, { color: AMBER }]}>SOME POINTS THIN-SAMPLED</Text>
            )}
          </View>
          <View style={styles.chartWrapper}>
            <Sparkline data={history} color={colors.primary} dotFill={colors.card} />
          </View>
          {/* X-axis labels */}
          <View style={styles.xLabels}>
            <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>
              {formatDate(history[0].recordedAt)}
            </Text>
            <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>
              {formatDate(history[history.length - 1].recordedAt)}
            </Text>
          </View>
        </View>

        {/* Audit log */}
        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AUDIT LOG</Text>
          {[...history].reverse().map((entry, i) => {
            const prev = [...history].reverse()[i + 1];
            const diff = prev
              ? historyScore500(entry.score, entry.provenance, entry.methodologyVersion) - historyScore500(prev.score, prev.provenance, prev.methodologyVersion)
              : null;
            const { evidence, confidence, thin } = historyRowDisplay(entry);
            return (
              <View key={i} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                <View style={styles.logLeft}>
                  <Text style={[styles.logDate, { color: colors.foreground }]}>
                    {formatDate(entry.recordedAt)}
                  </Text>
                  {evidence && (
                    <Text style={[styles.logEvidence, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {evidence}
                    </Text>
                  )}
                  {/* Confidence shows on every point that recorded one
                      (mirroring the web tooltip) — amber only when thin. */}
                  {confidence && (
                    <Text style={[styles.logConfidence, { color: thin ? AMBER : colors.mutedForeground }]}>
                      {confidence}
                    </Text>
                  )}
                </View>
                <View style={styles.logRight}>
                  <Text style={[styles.logScore, { color: colors.primary }]}>{historyScore500(entry.score, entry.provenance, entry.methodologyVersion)}</Text>
                  {diff !== null && (
                    <Text style={[styles.logDiff, { color: diff >= 0 ? '#4BAF8A' : '#ef4444' }]}>
                      {/* diff is already the difference of two 500-scale
                          endpoints — render it as-is, never rescale it. */}
                      {diff >= 0 ? '+' : ''}{diff}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBrand: { alignSelf: 'center', marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: 20, gap: 12 },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  demoText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  statDivider: { width: 1, height: 36 },
  chartCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginBottom: 12 },
  thinBadge: { fontSize: 9, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  chartWrapper: { alignItems: 'center' },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  logCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  logLeft: { flex: 1, gap: 2 },
  logDate: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  logEvidence: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  logConfidence: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  logRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logScore: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  logDiff: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
