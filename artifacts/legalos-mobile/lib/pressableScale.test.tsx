// @vitest-environment jsdom
//
// Behavioral tests for the shared PressableScale wrapper — pins the two
// defects the 2026-08-15 code review caught (haptics firing on web via
// navigator.vibrate, and caller onPressIn/onPressOut being swallowed) so
// a refactor can't reintroduce them.
// react-native/reanimated/haptics are mocked at the seam; the Pressable
// mock is a plain button, so press events behave like the DOM.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  impactAsync: vi.fn(),
  platform: { OS: 'web' as string },
}));

vi.mock('expo-haptics', () => ({
  impactAsync: h.impactAsync,
  ImpactFeedbackStyle: { Light: 'light' },
}));

vi.mock('react-native', () => ({
  Platform: h.platform,
  // deno-lint-ignore no-explicit-any
  Pressable: ({ children, onPress, onPressIn, onPressOut, style, ...rest }: any) => (
    // Style arrays contain reanimated transform objects — meaningless in the
    // DOM and not what these tests assert, so the mock drops them.
    <button onClick={onPress} onMouseDown={onPressIn} onMouseUp={onPressOut} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('react-native-reanimated', () => ({
  default: { createAnimatedComponent: (c: unknown) => c },
  useSharedValue: (v: unknown) => ({ value: v }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  withSpring: (v: unknown) => v,
}));

import { PressableScale } from '@/components/PressableScale';

const pressCount = () => h.impactAsync.mock.calls.length;

describe('PressableScale', () => {
  it('never vibrates on web, even with haptics enabled (navigator.vibrate is not a click haptic)', () => {
    h.platform.OS = 'web';
    render(<PressableScale onPress={() => {}}>tap</PressableScale>);
    const before = pressCount();
    fireEvent.click(screen.getByText('tap'));
    expect(pressCount()).toBe(before);
  });

  it('fires a light impact on native platforms', () => {
    h.platform.OS = 'ios';
    render(<PressableScale onPress={() => {}}>tap</PressableScale>);
    const before = pressCount();
    fireEvent.click(screen.getByText('tap'));
    expect(pressCount()).toBe(before + 1);
    h.platform.OS = 'web';
  });

  it('respects haptic={false} on native', () => {
    h.platform.OS = 'android';
    render(<PressableScale haptic={false} onPress={() => {}}>tap</PressableScale>);
    const before = pressCount();
    fireEvent.click(screen.getByText('tap'));
    expect(pressCount()).toBe(before);
    h.platform.OS = 'web';
  });

  it('forwards caller onPressIn/onPressOut instead of replacing them', () => {
    const onPressIn = vi.fn();
    const onPressOut = vi.fn();
    render(
      <PressableScale onPress={() => {}} onPressIn={onPressIn} onPressOut={onPressOut}>
        tap
      </PressableScale>,
    );
    const btn = screen.getByText('tap');
    fireEvent.mouseDown(btn);
    fireEvent.mouseUp(btn);
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a disabled wrapper neither presses nor buzzes', () => {
    const onPress = vi.fn();
    render(
      <PressableScale disabled onPress={onPress}>
        tap
      </PressableScale>,
    );
    const before = pressCount();
    fireEvent.click(screen.getByText('tap'));
    expect(onPress).not.toHaveBeenCalled();
    expect(pressCount()).toBe(before);
  });
});
