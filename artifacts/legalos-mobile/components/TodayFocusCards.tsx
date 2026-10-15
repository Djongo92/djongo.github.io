/**
 * Swipeable "Today's Focus" action card deck.
 *
 * Derives the top 3 categories by improvement gap, presents them as a
 * stacked deck, and lets the user swipe each card away (left or right).
 * Dismissed state persists in AsyncStorage and resets daily.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category } from '@/context/DataContext';
import { useColors } from '@/hooks/useColors';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING, EYEBROW_TRACKING } from '@/constants/typography';

const STORAGE_KEY = 'legalos_focus_dismissed';
const SWIPE_THRESHOLD = 100;

const CATEGORY_ACTIONS: Record<string, string> = {
  performance: 'Run Google PageSpeed on your homepage — target 85+ on mobile.',
  social: 'Post one legal insight on LinkedIn this week. 200 words moves the needle.',
  seoAuthority: 'List your firm in 2 more legal directories (Avvo, FindLaw, local).',
  thoughtLeadership: 'Publish a brief take on a recent ruling in your practice area.',
  reputation: 'Send a satisfied client a direct link to your Google review page today.',
};

interface DismissState {
  date: string; // ISO date string
  dismissed: string[]; // category keys
}

interface FocusCardProps {
  category: Category;
  index: number;         // position in stack (0 = top)
  isTop: boolean;
  onDismiss: (key: string, direction: 1 | -1) => void;
}

function FocusCard({ category, index, isTop, onDismiss }: FocusCardProps) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const dismiss = useCallback((dir: 1 | -1) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss(category.key, dir);
  }, [category.key, onDismiss]);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate(e => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
    })
    .onEnd(e => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = Math.sign(e.translationX) as 1 | -1;
        translateX.value = withSpring(dir * 600, { velocity: e.velocityX }, () => {
          runOnJS(dismiss)(dir);
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-200, 0, 200], [-12, 0, 12]);
    const scale = interpolate(index, [0, 1, 2], [1, 0.95, 0.9]);
    const yOffset = interpolate(index, [0, 1, 2], [0, 10, 18]);
    return {
      transform: [
        { translateY: yOffset + translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
        { scale },
      ],
      zIndex: 10 - index,
    };
  });

  const pct = Math.round((category.score / category.max) * 100);
  const gap = category.max - category.score;
  const action = CATEGORY_ACTIONS[category.key] ?? 'Work on this category to improve your score.';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          {
            backgroundColor: colors.card,
            borderColor: isTop ? `${category.color}40` : colors.border,
            shadowColor: category.color,
          },
        ]}
      >
        {/* Category badge */}
        <View style={[styles.badge, { backgroundColor: `${category.color}20`, borderColor: `${category.color}40` }]}>
          <View style={[styles.badgeDot, { backgroundColor: category.color }]} />
          <Text style={[styles.badgeText, { color: category.color }]}>{category.label.toUpperCase()}</Text>
        </View>

        {/* Score */}
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNum, { color: colors.foreground }]}>{pct}%</Text>
          <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}>of potential</Text>
          <View style={[styles.gapPill, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
            <Text style={[styles.gapText, { color: colors.primary }]}>+{Math.round(gap * 2.5)} pts available</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: category.color }]} />
        </View>

        {/* Action */}
        <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>TODAY'S ACTION</Text>
        <Text style={[styles.actionText, { color: colors.foreground }]}>{action}</Text>

        {/* Swipe hint on top card only */}
        {isTop && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>← swipe to dismiss →</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

interface TodayFocusCardsProps {
  categories: Category[];
}

export function TodayFocusCards({ categories }: TodayFocusCardsProps) {
  const colors = useColors();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) { setLoaded(true); return; }
      try {
        const state: DismissState = JSON.parse(raw);
        const today = new Date().toISOString().slice(0, 10);
        if (state.date === today) setDismissed(state.dismissed);
      } catch { /* ignore */ }
      setLoaded(true);
    });
  }, []);

  const dismiss = useCallback((key: string, _dir: 1 | -1) => {
    setDismissed(prev => {
      const next = [...prev, key];
      const today = new Date().toISOString().slice(0, 10);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, dismissed: next }));
      return next;
    });
  }, []);

  if (!loaded) return null;

  // Sort by biggest gap, take top 3, filter out dismissed — categories the
  // audit couldn't measure are excluded first, since a big "points available"
  // pill would misrepresent an unmeasured category as an achievable gap.
  const candidates = categories
    .filter(c => c.provenance !== 'missing')
    .sort((a, b) => (b.max - b.score) - (a.max - a.score))
    .slice(0, 3);

  const visible = candidates.filter(c => !dismissed.includes(c.key));

  if (visible.length === 0) {
    return (
      <View style={[styles.allDoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.allDoneEmoji]}>✓</Text>
        <Text style={[styles.allDoneTitle, { color: colors.foreground }]}>All caught up</Text>
        <Text style={[styles.allDoneBody, { color: colors.mutedForeground }]}>
          Today's focus items reviewed. Check back tomorrow.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TODAY'S FOCUS</Text>
      <View style={styles.deckContainer}>
        {/* Render back to front so top card is on top */}
        {[...visible].reverse().map((cat, reversedIndex) => {
          const index = visible.length - 1 - reversedIndex;
          return (
            <FocusCard
              key={cat.key}
              category={cat}
              index={index}
              isTop={index === 0}
              onDismiss={dismiss}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: EYEBROW_TRACKING,
    fontFamily: EYEBROW_FONT_FAMILY,
    marginBottom: 12,
  },
  deckContainer: {
    height: 210,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 10, fontFamily: EYEBROW_FONT_FAMILY, letterSpacing: EYEBROW_TIGHT_TRACKING },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNum: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  scoreMax: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  gapPill: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gapText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 3, borderRadius: 2 },
  actionLabel: { fontSize: 9, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  actionText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  // Instruction caption ("← swipe to dismiss →") — text, not a label;
  // the eyebrow tokens are for uppercase micro-labels, not captions.
  hint: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center', letterSpacing: 0.5, marginTop: 2 },
  // All done state
  allDoneCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  allDoneEmoji: { fontSize: 28 },
  allDoneTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  allDoneBody: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
});
