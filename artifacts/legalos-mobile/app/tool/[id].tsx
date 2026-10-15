import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { tools, SWIPE_FILE_ITEMS } from '@/data/tools';
import { callEdgeFunction, formatOutput } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useFirmContext } from '@/hooks/useFirmContext';
import { SERVER_KEYS } from '@/lib/battlePlanModel';
import { buildBioSlot, buildHeadlineSlot, saveLocalSlot } from '@/lib/battlePlanWrite';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';
import { BrandRow } from '@/components/BrandRow';

// Clipboard – try expo-clipboard first, fall back to nothing
async function copyToClipboard(text: string) {
  try {
    await Clipboard.setStringAsync(text);
  } catch {
    // silent fail on web
  }
}

function SwipeFileView({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.swipeScroll}>
      <Text style={[styles.swipeIntro, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        50+ proven templates for legal marketing. Tap any item to copy.
      </Text>
      {SWIPE_FILE_ITEMS.map(group => (
        <View key={group.category} style={{ marginBottom: 24 }}>
          <Text style={[styles.swipeCategory, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {group.category.toUpperCase()}
          </Text>
          {group.items.map((item, i) => {
            const isCopied = copied === item;
            return (
              <TouchableOpacity
                key={i}
                onPress={async () => {
                  await copyToClipboard(item);
                  setCopied(item);
                  setTimeout(() => setCopied(null), 2000);
                }}
                style={[
                  styles.swipeItem,
                  { backgroundColor: colors.card, borderColor: isCopied ? `${colors.primary}50` : colors.border },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.swipeItemText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  {item}
                </Text>
                <Feather
                  name={isCopied ? 'check' : 'copy'}
                  size={13}
                  color={isCopied ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

export default function ToolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 8 : insets.top;

  const { user, session } = useAuth();
  const { isDemo } = useData();

  const tool = tools.find(t => t.id === id);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  // Structured object the edge functions actually read — demo firm's context
  // in demo mode, the signed-in account's own `firm_context` otherwise
  // (or null, which makes the functions omit the block entirely).
  const { firmContext } = useFirmContext();

  if (!tool) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Tool not found.</Text>
      </View>
    );
  }

  // A finished Headline Lab / Bio Rewriter run feeds the Battle Plan — the
  // same user-state keys the web writes for a signed-in account, or an honest
  // on-device save for demo/anonymous. Never a silent no-op: the note below
  // the output always says which of the three happened.
  const armBattlePlan = async (data: unknown) => {
    if (!tool) return;
    const slot =
      tool.id === 'headlines' ? ('headline' as const)
      : tool.id === 'bio-rewriter' ? ('bio' as const)
      : null;
    if (!slot) return;
    const payload =
      slot === 'headline'
        ? buildHeadlineSlot(data, fieldValues.brief ?? '')
        : buildBioSlot(data, fieldValues.partnerName);
    if (!payload) return;

    if (user && session && !isDemo) {
      const push = await callEdgeFunction('user-state-set', {
        clientId: user.id,
        accessToken: session.access_token,
        key: SERVER_KEYS[slot],
        value: payload,
      });
      setSyncNote(
        push.ok
          ? `Armed your Battle Plan — the ${slot === 'headline' ? 'Headline champion' : 'Bio rewrite'} section now shows this on web and mobile.`
          : 'Generated, but syncing to your Battle Plan failed — copy the result now, it isn’t saved.',
      );
    } else {
      const saved = await saveLocalSlot(slot, payload);
      setSyncNote(
        !saved
          ? 'Couldn’t save on this device either — copy the result now, it isn’t kept.'
          : isDemo
            ? 'Demo mode — saved on this device only. The Battle Plan here will show it; nothing syncs.'
            : 'Saved on this device only. Sign in to arm your Battle Plan everywhere.',
      );
    }
  };

  const run = async () => {
    // Validate required fields
    for (const field of tool.fields) {
      if (!field.optional && !fieldValues[field.key]?.trim()) {
        Alert.alert('Missing field', `Please fill in: ${field.label}`);
        return;
      }
    }
    if (!tool.edgeFunction || !tool.requestBody) return;

    setLoading(true);
    setOutput(null);
    setError(null);
    setSyncNote(null);

    const body = tool.requestBody(fieldValues, firmContext);
    const result = await callEdgeFunction(tool.edgeFunction, body);

    setLoading(false);
    if (result.ok) {
      const text = formatOutput(result.data, tool.outputKey);
      setOutput(text || 'Done. No output returned.');
      await armBattlePlan(result.data);
    } else {
      setError(result.error);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Swipe file is a special static tool
  if (tool.id === 'swipe-file') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
          {/* Brand mark — shared component, same treatment as the tab headers. */}
          <BrandRow style={styles.headerBrand} />
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {tool.name}
            </Text>
            <View style={styles.navBack} />
          </View>
        </View>
        <SwipeFileView colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        {/* Brand mark — shared component, same treatment as the tab headers. */}
        <BrandRow style={styles.headerBrand} />
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {tool.name}
          </Text>
          <View style={styles.navBack} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Tool description */}
        <View style={[styles.descCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.descIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Feather name={tool.icon as keyof typeof Feather.glyphMap} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.descText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {tool.desc}
          </Text>
        </View>

        {/* Form fields */}
        <View style={{ gap: 16, marginBottom: 20 }}>
          {tool.fields.map(field => (
            <View key={field.key}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  {field.label.toUpperCase()}
                </Text>
                {field.optional && (
                  <Text style={[styles.optionalTag, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    optional
                  </Text>
                )}
              </View>
              <TextInput
                value={fieldValues[field.key] ?? ''}
                onChangeText={val => setFieldValues(prev => ({ ...prev, [field.key]: val }))}
                placeholder={field.placeholder}
                placeholderTextColor={`${colors.mutedForeground}80`}
                multiline={field.multiline}
                numberOfLines={field.rows}
                style={[
                  styles.input,
                  field.multiline && { minHeight: (field.rows ?? 3) * 22 + 24, textAlignVertical: 'top' },
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                    fontFamily: 'Inter_400Regular',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Run button */}
        <TouchableOpacity
          onPress={run}
          disabled={loading}
          style={[
            styles.runBtn,
            { backgroundColor: loading ? `${colors.primary}60` : colors.primary },
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0B1426" />
          ) : (
            <Feather name="play" size={15} color="#0B1426" />
          )}
          <Text style={[styles.runBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {loading ? 'Running…' : 'Run'}
          </Text>
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: 'rgba(240,80,80,0.08)', borderColor: 'rgba(240,80,80,0.25)' }]}>
            <Feather name="alert-circle" size={14} color="#F05050" />
            <Text style={[styles.errorText, { fontFamily: 'Inter_400Regular' }]}>{error}</Text>
          </View>
        )}

        {/* Output */}
        {output && (
          <View style={[styles.outputBox, { backgroundColor: colors.card, borderColor: `${colors.primary}30` }]}>
            <View style={styles.outputHeader}>
              <Text style={[styles.outputLabel, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                RESULT
              </Text>
              <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} activeOpacity={0.7}>
                <Feather name={copied ? 'check' : 'copy'} size={14} color={copied ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.copyText, { color: copied ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.outputText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              {output}
            </Text>
          </View>
        )}

        {/* Battle Plan arming note */}
        {syncNote && (
          <View style={[styles.syncNote, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}30` }]}>
            <Feather name="bookmark" size={12} color={colors.primary} />
            <Text style={[styles.syncNoteText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {syncNote}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBrand: { alignSelf: 'center', marginTop: 8, marginBottom: 6 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navBack: { width: 40 },
  navTitle: { fontSize: 15, flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  descCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  descIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  descText: { flex: 1, fontSize: 13, lineHeight: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fieldLabel: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  optionalTag: { fontSize: 10, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    marginBottom: 16,
  },
  runBtnText: { fontSize: 14, color: '#0B1426' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#F05050' },
  outputBox: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(196,160,53,0.2)',
  },
  outputLabel: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 12 },
  outputText: { padding: 14, fontSize: 13, lineHeight: 22 },
  syncNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  syncNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  // Swipe File
  swipeScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  swipeIntro: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  swipeCategory: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, marginBottom: 10 },
  swipeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
  },
  swipeItemText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
