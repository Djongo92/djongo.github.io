import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  /** The integer to count to. */
  value: number;
  /** Count-up duration in ms (default 1200). */
  duration?: number;
  /** Fired each time a count lands exactly on the value. */
  onComplete?: () => void;
}

/**
 * Counting number with a cubic ease-out — starts fast, decelerates onto the
 * value. Animates from the currently displayed number on every value change
 * (first mount counts up from 0). Use this for any number a user watches
 * change; never snap a headline number between values.
 */
export function AnimatedNumber({ value, duration = 1200, onComplete, ...textProps }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) {
      onCompleteRef.current?.();
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + eased * (value - from));
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <Text {...textProps}>{display}</Text>;
}
