import React from 'react';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed — 0.96 reads as a physical depress, not a wobble. */
  pressScale?: number;
  /** Light impact haptic on press (default true). Native only — on web a
   *  "haptic" is navigator.vibrate, which is never what a click should do. */
  haptic?: boolean;
  children?: React.ReactNode;
}

/**
 * The one tappable surface: every card, row, and CTA depresses with a stiff
 * spring and a light haptic, so the whole app responds to touch the same
 * physical way. Use this instead of TouchableOpacity (activeOpacity fades
 * feel like a webpage) or a bare Pressable (no feedback at all).
 */
export function PressableScale({
  style,
  pressScale = 0.96,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        scale.value = withSpring(pressScale, { damping: 15, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        // Native-only: the old Score-tab helper guarded the same way. On web
        // expo-haptics falls back to navigator.vibrate — a buzz on click.
        if (haptic && Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
