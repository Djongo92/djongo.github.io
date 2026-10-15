import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import type { Category } from '@/context/DataContext';

interface CategoryRowProps {
  category: Category;
  index: number;
}

export function CategoryRow({ category, index }: CategoryRowProps) {
  const colors = useColors();
  const isMissing = category.provenance === 'missing';
  const pct = isMissing ? 0 : category.score / category.max;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      index * 80 + 200,
      withTiming(pct, { duration: 700, easing: Easing.out(Easing.quad) }),
    );
  }, [pct, index]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {category.label}
        </Text>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.bar, barStyle, { backgroundColor: isMissing ? colors.mutedForeground : category.color, opacity: isMissing ? 0.3 : 1 }]}
          />
        </View>
      </View>
      <View style={styles.right}>
        {isMissing ? (
          <Text style={[styles.notMeasured, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            Not measured
          </Text>
        ) : (
          <>
            <Text style={[styles.score, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {Math.round(pct * 100)}%
            </Text>
            <Text style={[styles.max, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              of potential
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    // Title-case category names in a body row ("Performance", …) — not an
    // uppercase micro-label, so the eyebrow tokens would look wrong here.
    letterSpacing: 0.3,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 16,
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  score: {
    fontSize: 16,
  },
  max: {
    fontSize: 12,
    marginLeft: 1,
  },
  notMeasured: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
