import React, { useEffect } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { chapters, type ChapterSection } from '@/data/chapters';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING } from '@/constants/typography';
import { BrandRow } from '@/components/BrandRow';

const CALLOUT_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  insight:    { bg: 'rgba(91,138,240,0.08)',  border: 'rgba(91,138,240,0.3)',  icon: 'info',          label: 'Insight' },
  'pro-tip':  { bg: 'rgba(196,160,53,0.08)',  border: 'rgba(196,160,53,0.3)', icon: 'star',          label: 'Pro Tip' },
  mistake:    { bg: 'rgba(240,80,80,0.08)',   border: 'rgba(240,80,80,0.3)',  icon: 'alert-circle',  label: 'Common Mistake' },
  'quick-win':{ bg: 'rgba(75,175,138,0.08)', border: 'rgba(75,175,138,0.3)', icon: 'zap',           label: 'Quick Win' },
};

const CALLOUT_TEXT_COLOR: Record<string, string> = {
  insight: '#5B8AF0', 'pro-tip': '#C4A035', mistake: '#F05050', 'quick-win': '#4BAF8A',
};

const PRIORITY_LABEL: Record<string, string> = {
  'quick-win': 'Quick Win', strategic: 'Strategic', 'long-term': 'Long-Term',
};
const PRIORITY_COLOR: Record<string, string> = {
  'quick-win': '#4BAF8A', strategic: '#C4A035', 'long-term': '#5B8AF0',
};

function SectionRenderer({ section, colors }: { section: ChapterSection; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ marginBottom: 20 }}>
      {section.heading && (
        <Text style={[styles.sectionHeading, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {section.heading}
        </Text>
      )}
      {section.stat && (
        <View style={[styles.statBlock, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
          <Text style={[styles.statValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            {section.stat.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {section.stat.label}
          </Text>
        </View>
      )}
      {section.paragraphs?.map((p, i) => (
        <Text key={i} style={[styles.paragraph, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          {p}
        </Text>
      ))}
      {section.bullets?.map((b, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.bulletText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{b}</Text>
        </View>
      ))}
      {section.numbered?.map((n, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.numberedIndex, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            {i + 1}.
          </Text>
          <Text style={[styles.bulletText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{n}</Text>
        </View>
      ))}
      {section.pullQuote && (
        <View style={[styles.pullQuote, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.pullQuoteText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            {section.pullQuote}
          </Text>
        </View>
      )}
      {section.callout && (() => {
        const s = CALLOUT_STYLES[section.callout.type] ?? CALLOUT_STYLES.insight;
        const tc = CALLOUT_TEXT_COLOR[section.callout.type] ?? '#C4A035';
        return (
          <View style={[styles.callout, { backgroundColor: s.bg, borderColor: s.border }]}>
            <View style={styles.calloutHeader}>
              <Feather name={s.icon as keyof typeof Feather.glyphMap} size={13} color={tc} />
              <Text style={[styles.calloutLabel, { color: tc }]}>{s.label}</Text>
            </View>
            <Text style={[styles.calloutText, { color: tc, fontFamily: 'Inter_400Regular' }]}>
              {section.callout.content}
            </Text>
          </View>
        );
      })()}
      {section.comparison && (
        <View style={styles.comparisonRow}>
          {(['before', 'after'] as const).map(side => {
            const col = side === 'before' ? 'rgba(240,80,80,0.08)' : 'rgba(75,175,138,0.08)';
            const border = side === 'before' ? 'rgba(240,80,80,0.25)' : 'rgba(75,175,138,0.25)';
            const tc = side === 'before' ? '#F05050' : '#4BAF8A';
            const data = section.comparison![side];
            return (
              <View key={side} style={[styles.comparisonCard, { backgroundColor: col, borderColor: border }]}>
                <Text style={[styles.comparisonTitle, { color: tc }]}>{data.title}</Text>
                {data.items.map((item, i) => (
                  <Text key={i} style={[styles.comparisonItem, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                    {'— '}{item}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readChapters, doneActions, markRead, toggleAction } = useReadingProgress();

  const chapter = chapters.find(c => c.id === id);

  useEffect(() => {
    if (chapter) markRead(chapter.id);
  }, [chapter?.id]);

  if (!chapter) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Chapter not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === 'web' ? 8 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[styles.navbar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        {/* Brand mark — shared component so the reader carries the same brand
            treatment as every tab header (BrandRow's own bottom margin is
            reset here to keep the compact single-row navbar height). */}
        <BrandRow style={styles.navBrand} />
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Chapter title */}
        <View style={styles.chapterHead}>
          {/* Chapter number moved here (from the navbar, which now carries the
              brand mark) so it stays visible as an eyebrow above the title. */}
          <Text style={[styles.navChapterNum, { color: colors.primary }]}>
            Chapter {String(chapter.number).padStart(2, '0')}
          </Text>
          <Text style={[styles.chapterTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {chapter.title}
          </Text>
          <Text style={[styles.chapterSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {chapter.subtitle}
          </Text>
          {chapter.hook && (
            <View style={[styles.hookPill, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
              <Text style={[styles.hookText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                {chapter.hook}
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Content sections */}
        {chapter.content.map((section, i) => (
          <SectionRenderer key={i} section={section} colors={colors} />
        ))}

        {/* Action items */}
        {chapter.actionItems.length > 0 && (
          <View style={[styles.actionsBlock, { borderColor: colors.border }]}>
            <Text style={[styles.actionsTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Action Items
            </Text>
            <Text style={[styles.actionsSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Tap to mark as done
            </Text>
            {chapter.actionItems.map((action, i) => {
              const key = `${chapter.id}-action-${i}`;
              const done = doneActions.has(key);
              const pc = PRIORITY_COLOR[action.priority] ?? colors.primary;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleAction(key)}
                  activeOpacity={0.7}
                  style={[
                    styles.actionRow,
                    {
                      backgroundColor: done ? `${colors.primary}08` : colors.card,
                      borderColor: done ? `${colors.primary}30` : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.actionCheck,
                      {
                        backgroundColor: done ? colors.primary : 'transparent',
                        borderColor: done ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {done && <Feather name="check" size={10} color="#0B1426" />}
                  </View>
                  <View style={styles.actionContent}>
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: done ? colors.mutedForeground : colors.foreground,
                          textDecorationLine: done ? 'line-through' : 'none',
                          fontFamily: 'Inter_400Regular',
                        },
                      ]}
                    >
                      {action.text}
                    </Text>
                    <View style={[styles.priorityTag, { backgroundColor: `${pc}12`, borderColor: `${pc}30` }]}>
                      <Text style={[styles.priorityTagText, { color: pc }]}>
                        {PRIORITY_LABEL[action.priority]}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Navigation */}
        <View style={styles.chapterNav}>
          {chapter.number > 1 && (
            <TouchableOpacity
              onPress={() => {
                const prev = chapters.find(c => c.number === chapter.number - 1);
                if (prev) router.replace(`/chapter/${prev.id}`);
              }}
              style={[styles.navBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Feather name="arrow-left" size={14} color={colors.primary} />
              <Text style={[styles.navBtnText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                Previous
              </Text>
            </TouchableOpacity>
          )}
          {chapter.number < chapters.length && (
            <TouchableOpacity
              onPress={() => {
                const next = chapters.find(c => c.number === chapter.number + 1);
                if (next) router.replace(`/chapter/${next.id}`);
              }}
              style={[styles.navBtn, styles.navBtnNext, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
            >
              <Text style={[styles.navBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                Next Chapter
              </Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40 },
  navBrand: { marginBottom: 0 },
  navChapterNum: { fontSize: 12, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  scroll: { paddingHorizontal: 20 },
  chapterHead: { paddingTop: 24, paddingBottom: 20, gap: 8 },
  chapterTitle: { fontSize: 26, lineHeight: 34, letterSpacing: -0.3 },
  chapterSubtitle: { fontSize: 15, lineHeight: 22 },
  hookPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: 1,
    marginTop: 4,
  },
  hookText: { fontSize: 12, lineHeight: 17 },
  divider: { height: 1, marginBottom: 24 },
  sectionHeading: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 6, paddingRight: 4 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8, flexShrink: 0 },
  numberedIndex: { fontSize: 13, width: 20, marginTop: 2, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21 },
  pullQuote: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 4,
    marginVertical: 8,
  },
  pullQuoteText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  callout: {
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginVertical: 8,
    gap: 6,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calloutLabel: { fontSize: 11, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  calloutText: { fontSize: 13, lineHeight: 20 },
  statBlock: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 40, lineHeight: 48, letterSpacing: -1 },
  statLabel: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  comparisonRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  comparisonCard: { flex: 1, padding: 12, borderRadius: 4, borderWidth: 1, gap: 6 },
  comparisonTitle: { fontSize: 11, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginBottom: 2 },
  comparisonItem: { fontSize: 12, lineHeight: 18 },
  actionsBlock: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 4,
  },
  actionsTitle: { fontSize: 17, marginBottom: 2 },
  actionsSubtitle: { fontSize: 12, marginBottom: 12 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  actionCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  actionContent: { flex: 1, gap: 6 },
  actionText: { fontSize: 13, lineHeight: 19 },
  priorityTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  priorityTagText: { fontSize: 10, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  chapterNav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 32,
    marginBottom: 8,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  navBtnNext: {},
  navBtnText: { fontSize: 13 },
});
