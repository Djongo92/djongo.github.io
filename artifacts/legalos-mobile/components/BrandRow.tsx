/**
 * Compact brand mark + wordmark shown at the top of every main tab header —
 * the single source of truth for the treatment the Score tab introduced
 * (LogoMark size 18, colors.primary, Inter_700Bold). Tab screens render this
 * above their own header content so the brand stays present after login no
 * matter which tab is active.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LogoMark } from './LogoMark';

interface BrandRowProps {
  /** Optional style override — e.g. compact navbars reset the default bottom
   *  margin so the brand mark fits a single-row header. */
  style?: StyleProp<ViewStyle>;
}

export function BrandRow({ style }: BrandRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.brandRow, style]}>
      <LogoMark size={18} color={colors.primary} />
      <Text style={[styles.brandWord, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
        Uvid
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  brandWord: { fontSize: 13, letterSpacing: 0.4 },
});
