/**
 * Branded score card modal.
 *
 * Shows a beautifully designed share card for the firm's current score.
 * Tap "Share" to invoke the native share sheet with a pre-formatted message.
 */
import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getCategories, type Firm } from '@/context/DataContext';
import { computeMeasuredTotals, measuredScoreLabel, toScale500 } from '@/lib/measuredScore';

// Tier thresholds are on the full 500-point scale — a firm with an
// unmeasured category is compared on its measured-equivalent score, not
// its raw total, so an excluded category never quietly demotes its tier.
function tierLabel(score: number): string {
  if (score >= 400) return 'ELITE';
  if (score >= 350) return 'ADVANCED';
  if (score >= 300) return 'GROWING';
  if (score >= 250) return 'EMERGING';
  return 'DEVELOPING';
}

function tierDescription(score: number): string {
  if (score >= 400) return 'Top 5% of the Serbia market';
  if (score >= 350) return 'Top 15% of the Serbia market';
  if (score >= 300) return 'Top 30% of the Serbia market';
  if (score >= 250) return 'Top 50% of the Serbia market';
  return 'Bottom 50% of the Serbia market';
}

interface ShareCardProps {
  firm: Firm;
  visible: boolean;
  onClose: () => void;
}

export function ShareCard({ firm, visible, onClose }: ShareCardProps) {
  const colors = useColors();
  const categories = getCategories(firm);
  const measured = computeMeasuredTotals(categories);
  const totalCount = categories.length;
  const measuredCount = totalCount - measured.excludedLabels.length;
  const tierEquivalentScore = (firm.score / measured.measuredMax) * 500;
  const tier = tierLabel(tierEquivalentScore);
  const scoreLine = measuredScoreLabel(firm.score, measured);

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = [
      `📊 ${firm.name} — Uvid Market Visibility Score`,
      ``,
      `Score: ${scoreLine} · ${tier}`,
      `Rank: #${firm.rank} in Serbia`,
      `Top ${firm.percentile}% of 92 benchmarked firms`,
      ``,
      `Get your firm's score at legalos.rs`,
    ].join('\n');

    await Share.share({ message, title: `${firm.name} — Uvid Score` });
  };

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Score Card</Text>

          {/* The actual card */}
          <LinearGradient
            colors={['#111828', '#0B0F1E']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardLogo, { backgroundColor: colors.primary }]} />
              <Text style={[styles.cardBrand, { color: colors.foreground }]}>Uvid</Text>
              <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{today}</Text>
            </View>

            {/* Firm name */}
            <Text style={[styles.cardFirm, { color: colors.foreground }]}>{firm.name}</Text>
            <Text style={[styles.cardDomain, { color: colors.mutedForeground }]}>{firm.domain}</Text>

            {/* Score display */}
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreNum, { color: colors.primary }]}>{toScale500(firm.score, measured.measuredMax || 500)}</Text>
              <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}>
                /500{measured.isPartial ? '*' : ''}
              </Text>
            </View>
            {measured.isPartial && (
              <Text style={[styles.measuredCaption, { color: colors.mutedForeground }]}>
                *Scored on {measuredCount} of {totalCount} categories —{' '}
                {measured.excludedLabels.join(' & ')} excluded, not counted as zero
              </Text>
            )}

            {/* Tier + rank */}
            <View style={[styles.tierRow, { borderTopColor: `${colors.primary}20` }]}>
              <View style={styles.tierItem}>
                <Text style={[styles.tierValue, { color: colors.primary }]}>{tier}</Text>
                <Text style={[styles.tierLabel, { color: colors.mutedForeground }]}>Tier</Text>
              </View>
              <View style={[styles.tierDivider, { backgroundColor: colors.border }]} />
              <View style={styles.tierItem}>
                <Text style={[styles.tierValue, { color: colors.primary }]}>#{firm.rank}</Text>
                <Text style={[styles.tierLabel, { color: colors.mutedForeground }]}>Serbia Rank</Text>
              </View>
              <View style={[styles.tierDivider, { backgroundColor: colors.border }]} />
              <View style={styles.tierItem}>
                <Text style={[styles.tierValue, { color: colors.primary }]}>Top {firm.percentile}%</Text>
                <Text style={[styles.tierLabel, { color: colors.mutedForeground }]}>of 92 firms</Text>
              </View>
            </View>

            {/* Verified footer */}
            <Text style={[styles.verifiedText, { color: colors.mutedForeground }]}>
              ✓ Verified by Uvid · {tierDescription(tierEquivalentScore)}
            </Text>
          </LinearGradient>

          {/* Share button */}
          <Pressable
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
          >
            <Feather name="share-2" size={16} color={colors.primaryForeground} />
            <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>Share</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelRow}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardLogo: { width: 20, height: 20, borderRadius: 5 },
  cardBrand: { fontSize: 14, fontFamily: 'Inter_700Bold', flex: 1 },
  cardDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cardFirm: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  cardDomain: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  scoreBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 8 },
  scoreNum: { fontSize: 56, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  scoreMax: { fontSize: 20, fontFamily: 'Inter_400Regular' },
  measuredCaption: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: -4 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  tierItem: { flex: 1, alignItems: 'center', gap: 2 },
  tierValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  tierLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  tierDivider: { width: 1, height: 28 },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    // Sentence-case footer caption ("✓ Verified by Uvid · …") — a text
    // element, not an eyebrow label; wide tracking would space it out.
    letterSpacing: 0.3,
    marginTop: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  shareButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancelRow: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
