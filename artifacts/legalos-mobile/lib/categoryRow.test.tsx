// @vitest-environment jsdom
//
// Rendering-level tests for CategoryRow — pins the isMissing branch so a
// future edit to the conditional JSX can't silently flip the label while the
// data-layer tests stay green.
//
// react-native, reanimated and the color hook are all mocked at the module
// seam; the test only cares about the "Not measured" / score text nodes.

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// StyleSheet, View, Text – minimum needed for CategoryRow to render in jsdom.
vi.mock('react-native', () => {
  const Text = ({ children, style: _s, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...rest}>{children}</span>
  );
  const View = ({ children, style: _s, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...rest}>{children}</div>
  );
  return {
    StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
    Text,
    View,
  };
});

// Animated.View is just a div; shared-value / animated-style helpers are no-ops.
vi.mock('react-native-reanimated', () => {
  const Animated = {
    View: ({ children, style: _s, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...rest}>{children}</div>
    ),
  };
  return {
    default: Animated,
    Easing: { out: () => null, quad: null },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: (v: unknown) => v,
  };
});

// useColors – return a stable colour object; CategoryRow only reads a few keys.
vi.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    border: '#ccc',
    mutedForeground: '#888',
    foreground: '#000',
  }),
}));

import { CategoryRow } from '@/components/CategoryRow';
import type { Category } from '@/context/DataContext';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<Category>): Category {
  return {
    key: 'seoAuthority',
    label: 'SEO & Authority',
    score: 30,
    max: 60,
    color: '#4f8ef7',
    provenance: 'api',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CategoryRow rendering', () => {
  it('does NOT show "Not measured" when provenance is "api" and score is 30', () => {
    const cat = makeCategory({ provenance: 'api', score: 30 });
    render(<CategoryRow category={cat} index={0} />);
    expect(screen.queryByText('Not measured')).toBeNull();
  });

  it('shows "Not measured" when provenance is "missing"', () => {
    const cat = makeCategory({ provenance: 'missing', score: 0 });
    render(<CategoryRow category={cat} index={0} />);
    expect(screen.getByText('Not measured')).toBeDefined();
  });

  it('shows a percentage score (not "Not measured") when provenance flips from missing to api', () => {
    // First render: missing.
    const { rerender } = render(
      <CategoryRow category={makeCategory({ provenance: 'missing', score: 0 })} index={0} />,
    );
    expect(screen.getByText('Not measured')).toBeDefined();

    // Second render: measured — simulates a fresh audit where seoAuthority is now "api".
    rerender(
      <CategoryRow category={makeCategory({ provenance: 'api', score: 30 })} index={0} />,
    );
    expect(screen.queryByText('Not measured')).toBeNull();
    // score 30 / max 60 = 50%, displayed as "50%"
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('shows "Not measured" for every missing provenance variant', () => {
    for (const prov of ['missing'] as const) {
      const { unmount } = render(
        <CategoryRow category={makeCategory({ provenance: prov })} index={0} />,
      );
      expect(screen.getByText('Not measured')).toBeDefined();
      unmount();
    }
  });

  it('renders the category label regardless of provenance', () => {
    const measured = render(
      <CategoryRow category={makeCategory({ provenance: 'api' })} index={0} />,
    );
    expect(measured.getByText('SEO & Authority')).toBeDefined();
    measured.unmount();

    const missing = render(
      <CategoryRow category={makeCategory({ provenance: 'missing' })} index={0} />,
    );
    expect(missing.getByText('SEO & Authority')).toBeDefined();
    missing.unmount();
  });
});
