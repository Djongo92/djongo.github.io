import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { getCategories, type Firm } from '@/context/DataContext';
import { computeMeasuredTotals, toScale500 } from '@/lib/measuredScore';
import { isStale, AUDIT_STALE_AFTER_DAYS } from '@/lib/scoreFreshness';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';
import { WARNING } from '@/constants/colors';

// Same amber the score-history chart uses for thin-sampled points — keep the
// two thin-peer treatments visually identical across the app.
const AMBER = WARNING;

interface FirmRowProps {
  firm: Firm;
}

export function FirmRow({ firm }: FirmRowProps) {
  const colors = useColors();
  const isYou = !!firm.isYou;
  const measured = computeMeasuredTotals(getCategories(firm));
  // Directory-standing rows (no full audit) score on the directory index's
  // own 100-point ceiling — label them instead of implying a full audit.
  const isDirectoryOnly = !firm.hasFullAudit;

  // Trust flags for full-audit rows only — directory-only rows carry no audit
  // timestamp or peer sample, so they render neither badge (a fabricated
  // "fresh"/"thin" flag would be as misleading as a fabricated zero). Stale
  // uses the SAME 90-day window as the web app; thin uses the same
  // confidence < 1 rule as the score-history chart.
  const showStale = !isDirectoryOnly && isStale(firm.auditedAt, AUDIT_STALE_AFTER_DAYS);
  const showThin =
    !isDirectoryOnly && firm.confidenceScore != null && firm.confidenceScore < 1;

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: isYou ? `${colors.primary}12` : 'transparent',
        },
      ]}
    >
      {/* Rank */}
      <View style={styles.rankBox}>
        <Text
          style={[
            styles.rank,
            {
              color: firm.rank <= 3 ? colors.primary : colors.mutedForeground,
              fontFamily: 'Inter_700Bold',
            },
          ]}
        >
          {firm.rank <= 3 ? ['🥇', '🥈', '🥉'][firm.rank - 1] : `#${firm.rank}`}
        </Text>
      </View>

      {/* Name + domain */}
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            {
              color: isYou ? colors.primary : colors.foreground,
              fontFamily: 'Inter_600SemiBold',
            },
          ]}
          numberOfLines={1}
        >
          {firm.name}
          {isYou ? '  ← you' : ''}
        </Text>
        <Text
          style={[styles.domain, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          numberOfLines={1}
        >
          {isDirectoryOnly ? 'Directory standing only' : firm.domain}
        </Text>
        {/* Compact trust badges — stale audit + thin peer group. Both amber,
            same treatment as the score-history chart's thin-sampled flag. */}
        {(showStale || showThin) && (
          <View style={styles.badgeRow}>
            {showStale && (
              <View style={[styles.badge, { borderColor: `${AMBER}55`, backgroundColor: `${AMBER}12` }]}>
                <Text style={[styles.badgeText, { color: AMBER, fontFamily: EYEBROW_FONT_FAMILY }]}>
                  STALE DATA
                </Text>
              </View>
            )}
            {showThin && (
              <View style={[styles.badge, { borderColor: `${AMBER}55`, backgroundColor: `${AMBER}12` }]}>
                <Text style={[styles.badgeText, { color: AMBER, fontFamily: EYEBROW_FONT_FAMILY }]}>
                  THIN PEER GROUP
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Score — rescaled to the public 500-point scale: full-audit rows
          against their measured denominator, directory-only rows against
          the directory index's 100-point ceiling. */}
      <View style={styles.scoreBox}>
        <Text
          style={[
            styles.score,
            {
              color: isYou ? colors.primary : colors.foreground,
              fontFamily: 'Inter_700Bold',
            },
          ]}
        >
          {toScale500(firm.score, isDirectoryOnly ? 100 : measured.measuredMax || 500)}
        </Text>
        <Text style={[styles.max, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {isDirectoryOnly ? '/500' : `/500${measured.isPartial ? '*' : ''}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankBox: {
    width: 40,
  },
  rank: {
    fontSize: 14,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
  },
  domain: {
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: EYEBROW_TRACKING,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  score: {
    fontSize: 18,
  },
  max: {
    fontSize: 11,
    marginLeft: 1,
  },
});
