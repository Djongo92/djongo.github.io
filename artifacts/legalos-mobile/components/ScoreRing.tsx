import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { toScale500 } from '@/lib/measuredScore';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { TIER_COLORS } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 220;
const STROKE_WIDTH = 14;
const GLOW_STROKE = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_SCORE = 500;

function tierLabel(score: number): string {
  if (score >= 400) return 'ELITE';
  if (score >= 350) return 'ADVANCED';
  if (score >= 300) return 'GROWING';
  if (score >= 250) return 'EMERGING';
  return 'DEVELOPING';
}

function tierColor(score: number): string {
  if (score >= 400) return TIER_COLORS.blue;
  if (score >= 350) return TIER_COLORS.purple;
  if (score >= 300) return TIER_COLORS.gold;
  if (score >= 250) return TIER_COLORS.green;
  return TIER_COLORS.orange;
}

interface ScoreRingProps {
  score: number;
  percentile?: number;
  /** Fair denominator when a category is unmeasured — defaults to the full 500-point scale. */
  measuredMax?: number;
  /** True when at least one category was excluded from measuredMax. */
  isPartial?: boolean;
}

export function ScoreRing({ score, percentile, measuredMax = MAX_SCORE, isPartial = false }: ScoreRingProps) {
  const colors = useColors();
  // Partial audits read against their measured max, on the 500-point scale.
  const displayTarget = toScale500(score, measuredMax);
  const progress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const scorePulse = useSharedValue(1);
  // Subtle pulse when the count-up lands — first land only, so a refresh
  // re-animating the number doesn't keep thumping.
  const landedOnce = useRef(false);
  const handleCountComplete = () => {
    if (landedOnce.current) return;
    landedOnce.current = true;
    scorePulse.value = withSpring(1.06, { damping: 8, stiffness: 200 }, () => {
      scorePulse.value = withSpring(1, { damping: 12 });
    });
  };

  useEffect(() => {
    // Spring animation for the arc — slightly bouncy, clamped at 0–1.
    progress.value = withDelay(
      200,
      withSpring(score / measuredMax, {
        mass: 1,
        damping: 22,
        stiffness: 90,
        overshootClamping: true,
      }),
    );

    // Glow fades in after the ring fills.
    glowOpacity.value = withDelay(600, withTiming(0.18, { duration: 800 }));
  }, [score, measuredMax]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress.value))),
  }));

  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress.value))),
    strokeOpacity: glowOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scorePulse.value }],
  }));

  // Tier reflects performance on what was actually measured, not the raw
  // absolute score — a firm scoring well on a partial denominator (an
  // unmeasured category excluded above) shouldn't read as a lower tier
  // than a firm with the same percentage on the full 200 points.
  const tierEquivalentScore = (score / measuredMax) * MAX_SCORE;
  const tc = tierColor(tierEquivalentScore);

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Glow layer (wider, low opacity, same color) */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={tc}
          strokeWidth={GLOW_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={glowProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={tc}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={arcProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>

      <Animated.View style={[styles.center, pulseStyle]}>
        <AnimatedNumber
          value={displayTarget}
          duration={1400}
          onComplete={handleCountComplete}
          style={[styles.score, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
        />
        <Text style={[styles.max, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          / 500{isPartial ? '*' : ''}
        </Text>
        <Text style={[styles.tier, { color: tc, fontFamily: 'Inter_600SemiBold' }]}>
          {tierLabel(tierEquivalentScore)}
        </Text>
        {percentile != null && (
          <Text style={[styles.percentile, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Top {percentile}%
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: -2,
  },
  max: {
    fontSize: 14,
    marginTop: 2,
    // Data value ("/ 500"), not a label — only the tier line below is
    // eyebrow voice; the denominator keeps its own tracking.
    letterSpacing: 0.5,
  },
  tier: {
    fontSize: 10,
    letterSpacing: EYEBROW_TRACKING,
    fontFamily: EYEBROW_FONT_FAMILY,
    marginTop: 6,
  },
  percentile: {
    fontSize: 12,
    marginTop: 2,
  },
});
