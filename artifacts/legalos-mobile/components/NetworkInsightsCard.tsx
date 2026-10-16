/**
 * Network Insights — anonymised cross-firm benchmark cards, the mobile port
 * of the web CommandCenter's NetworkInsights section (same edge payload).
 *
 * Gating mirrors the web treatment exactly:
 *   - account-only: hidden entirely when there is no session token (the
 *     edge function computes for the signed-in firm's membership; there is
 *     nothing honest to show a signed-out demo browser). Visibility gates
 *     on auth identity, NOT on isDemo — a signed-in account with no audits
 *     still browses demo display data but must see the locked state so it
 *     knows what a second audit unlocks.
 *   - <2 own audits: locked state explaining what unlocks it.
 *   - loading: skeleton placeholders keep the section height stable.
 *   - empty insights: cohort still gathering / privacy floor copy — never
 *     an exact small-cohort number.
 *
 * Every stat is a peer-group aggregate; failures are non-blocking (the
 * skeleton simply stays, matching web's silent-failure treatment).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { callFunction } from '@/lib/supabase';
import {
  type LoadedInsights,
  networkInsightsGate,
  networkInsightsViewState,
  loadNetworkInsights,
  insightSampleLine,
} from '@/lib/networkInsights';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';

export function NetworkInsightsCard() {
  const colors = useColors();
  const { session } = useAuth();
  const { auditHistory } = useData();
  const [loaded, setLoaded] = useState<LoadedInsights | null>(null);

  const accessToken = session?.access_token ?? null;
  const gate = networkInsightsGate(accessToken, auditHistory.length);

  useEffect(() => {
    if (!gate.shouldFetch || !accessToken) return;
    let cancelled = false;
    loadNetworkInsights(accessToken, callFunction).then((result) => {
      if (cancelled || result === null) return; // null → skeleton stays (non-blocking)
      setLoaded(result);
    });
    return () => { cancelled = true; };
  }, [gate.shouldFetch, accessToken]);

  const viewState = networkInsightsViewState(gate, loaded);

  // Account-only feature — nothing honest to show a signed-out browser.
  if (viewState === 'hidden') return null;

  const insights = loaded?.insights ?? [];
  const cohortSize = loaded?.cohortSize ?? 0;

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="share-2" size={14} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Network Insights
          </Text>
        </View>
        <Text style={[styles.headerNote, { color: colors.mutedForeground, fontFamily: EYEBROW_FONT_FAMILY }]}>
          ANONYMISED PEERS
        </Text>
      </View>

      {viewState === 'locked' ? (
        // Locked — honest about what unlocks it.
        <View style={[styles.quietCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.quietText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Unlock peer insights after your second audit — once there's a trend, we'll show how firms like yours are moving.
          </Text>
        </View>
      ) : viewState === 'loading' ? (
        // Loading (or failed silently) — stable-height skeletons.
        <View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.skelBar, { backgroundColor: colors.border, width: 96 }]} />
              <View style={[styles.skelBar, { backgroundColor: colors.border, width: 64, height: 18 }]} />
              <View style={[styles.skelBar, { backgroundColor: colors.border, width: '100%', marginBottom: 0 }]} />
            </View>
          ))}
        </View>
      ) : viewState === 'empty' ? (
        // Cohort under the privacy floor — say so without numbers.
        <View style={[styles.quietCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quietText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Peer insights for your group are still gathering — they appear once enough comparable firms have measured
            {cohortSize > 0 ? ' (we never show statistics from fewer than 3 firms)' : ''}.
          </Text>
        </View>
      ) : (
        <View>
          {insights.map((insight) => (
            <View key={insight.key} style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.insightTitle, { color: colors.primary, fontFamily: EYEBROW_FONT_FAMILY }]}>
                {insight.title.toUpperCase()}
              </Text>
              <Text style={[styles.insightStat, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                {insight.stat}
              </Text>
              <Text style={[styles.insightDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {insight.detail}
              </Text>
              <Text style={[styles.insightSample, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {insightSampleLine(insight)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
  },
  headerNote: {
    fontSize: 9,
    letterSpacing: EYEBROW_TRACKING,
  },
  quietCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
  },
  quietText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 10,
    letterSpacing: EYEBROW_TRACKING,
    marginBottom: 6,
  },
  insightStat: {
    fontSize: 22,
    marginBottom: 6,
  },
  insightDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  insightSample: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 10,
  },
  skelBar: {
    height: 10,
    borderRadius: 3,
    marginBottom: 8,
    opacity: 0.5,
  },
});
