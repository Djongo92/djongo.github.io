/**
 * The Uvid mark: a "U" enclosed by a ring.
 *
 * Matches the geometry in artifacts/legalos/src/components/Logo.tsx exactly —
 * same viewBox (0 0 64 64), same circle, same U path — translated to
 * react-native-svg so it renders natively on iOS and Android.
 *
 * `color` defaults to the brand gold (#C49C36). Pass a different value for
 * muted or light-background contexts.
 */
import React from 'react';
import { Circle, Path, Svg } from 'react-native-svg';

interface LogoMarkProps {
  size?: number;
  color?: string;
}

export function LogoMark({ size = 28, color = '#C49C36' }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <Circle
        cx="32"
        cy="32"
        r="25"
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={4}
      />
      <Path
        d="M22 17 V38 A10 10 0 0 1 42 38 V17"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
