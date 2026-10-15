import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { tools, type ToolCategory } from '@/data/tools';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING } from '@/constants/typography';
import themeColors, { SUCCESS, GOLD_DEEP } from '@/constants/colors';
import { BrandRow } from '@/components/BrandRow';
import { PressableScale } from '@/components/PressableScale';

const CATEGORIES: { id: ToolCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'content', label: 'Content' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'strategy', label: 'Strategy' },
];

const MOBILE_BADGE: Record<string, { label: string; color: string }> = {
  full: { label: 'Full', color: SUCCESS },
  limited: { label: 'Limited', color: GOLD_DEEP },
  'desktop-only': { label: 'Desktop', color: themeColors.dark.mutedForeground },
};

export default function WorkshopScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? tools
    : tools.filter(t => t.category === activeCategory);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark — same treatment as the Score tab */}
        <BrandRow />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            AI Workshop
          </Text>
          <View style={[styles.countPill, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
            <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              11 tools
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Turn your score data into deployable marketing assets.
        </Text>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map(cat => (
            <PressableScale
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeCategory === cat.id ? colors.primary : colors.card,
                  borderColor: activeCategory === cat.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: activeCategory === cat.id ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>

        {/* Tool grid */}
        <View style={styles.grid}>
          {filtered.map(tool => {
            const badge = MOBILE_BADGE[tool.mobile];
            const isDesktopOnly = tool.mobile === 'desktop-only';
            return (
              <PressableScale
                key={tool.id}
                onPress={() => !isDesktopOnly && router.push(`/tool/${tool.id}`)}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDesktopOnly ? colors.border : `${colors.border}`,
                    opacity: isDesktopOnly ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.toolHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
                    <Feather name={tool.icon as keyof typeof Feather.glyphMap} size={18} color={colors.primary} />
                  </View>
                  <View
                    style={[
                      styles.mobileBadge,
                      { backgroundColor: `${badge.color}15`, borderColor: `${badge.color}30` },
                    ]}
                  >
                    <Text style={[styles.mobileBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.toolName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                  {tool.name}
                </Text>
                <Text
                  style={[styles.toolDesc, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
                  numberOfLines={3}
                >
                  {tool.desc}
                </Text>
                {!isDesktopOnly && (
                  <View style={styles.toolFooter}>
                    <Text style={[styles.openText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                      Open
                    </Text>
                    <Feather name="arrow-right" size={13} color={colors.primary} />
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          AI tools require the Uvid platform. Open the web app to authenticate.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, letterSpacing: -0.5 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  countText: { fontSize: 12 },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  filterScroll: { marginBottom: 16 },
  filterRow: { gap: 8, paddingHorizontal: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 4,
  },
  toolCard: {
    width: '47.5%',
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    gap: 8,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  mobileBadgeText: { fontSize: 9, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  toolName: { fontSize: 13, lineHeight: 18 },
  toolDesc: { fontSize: 11, lineHeight: 16 },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  openText: { fontSize: 12 },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
