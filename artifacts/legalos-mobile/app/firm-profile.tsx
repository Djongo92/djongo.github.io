/**
 * Firm Profile screen — the mobile counterpart of the web Settings page's
 * Firm Context card (SettingsPage.tsx). Signed-in users pick their practice
 * area, firm size, and primary goal; saving writes the same `firm_context`
 * server-state key the web reads (user-state-set), so both surfaces stay in
 * sync and the next workshop tool run carries the updated context (the
 * reader hook refetches on focus).
 *
 * Signed-out visitors see the demo firm's profile read-only — the demo
 * context is what demo tool runs send, so editing it would be a lie.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useFirmContext } from '@/hooks/useFirmContext';
import { callEdgeFunction } from '@/lib/api';
import {
  PRACTICE_AREAS,
  FIRM_SIZES,
  GOALS,
  MARKETS,
  buildFirmContextSetBody,
  notifyFirmContextSaved,
} from '@/lib/firmContext';
import { EYEBROW_FONT_FAMILY, EYEBROW_TRACKING } from '@/constants/typography';

type Colors = ReturnType<typeof useColors>;

function ChipGroup({ label, options, value, onChange, disabled, colors }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  colors: Colors;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
      <View style={styles.chips}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              disabled={disabled}
              onPress={() => onChange(opt)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? `${colors.primary}1A` : 'transparent',
                  opacity: disabled ? 0.55 : 1,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function FirmProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, session } = useAuth();
  const { firmContext, resolvedClientId } = useFirmContext();
  const signedIn = !!(user && session);

  const [practiceArea, setPracticeArea] = useState('');
  const [firmSize, setFirmSize] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [market, setMarket] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Prefill once from the loaded context (account's own, or the demo firm's
  // when signed out). Only the first non-null load seeds the form — later
  // refetches must not clobber an edit in progress.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !firmContext) return;
    seeded.current = true;
    setPracticeArea(firmContext.practiceArea);
    setFirmSize(firmContext.firmSize);
    setPrimaryGoal(firmContext.primaryGoal);
    setMarket(firmContext.market ?? '');
  }, [firmContext]);

  const complete = !!practiceArea && !!firmSize && !!primaryGoal;
  const handleSave = async () => {
    if (!signedIn || !complete || saving) return;
    setSaving(true);
    setStatus(null);
    const res = await callEdgeFunction(
      'user-state-set',
      // Pin the firm the profile was loaded from — for multi-firm accounts
      // the resolver could pick a different member firm on this write.
      buildFirmContextSetBody(
        user!.id,
        session!.access_token,
        { practiceArea, firmSize, primaryGoal, ...(market ? { market } : {}) },
        resolvedClientId,
      ),
    );
    setSaving(false);
    if (res.ok) {
      // Mounted tool screens refetch immediately (see onFirmContextSaved),
      // so the next run carries this context.
      notifyFirmContextSaved();
      setStatus({ ok: true, text: 'Saved — your next tool run uses it.' });
    } else {
      setStatus({ ok: false, text: res.error ?? "Couldn't save — try again." });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Firm Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {!signedIn && (
          <View style={[styles.noteBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              This is the demo firm's profile — sign in to set your own.
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardIntro, { color: colors.mutedForeground }]}>
            Every AI tool run carries this context — practice, size, and goal — so recommendations sound like
            they're for your firm. Saved here, it syncs with the web app's Settings page.
          </Text>

          <ChipGroup
            label="Practice area"
            options={PRACTICE_AREAS}
            value={practiceArea}
            onChange={(v) => { setPracticeArea(v); setStatus(null); }}
            disabled={!signedIn}
            colors={colors}
          />
          <ChipGroup
            label="Firm size"
            options={FIRM_SIZES}
            value={firmSize}
            onChange={(v) => { setFirmSize(v); setStatus(null); }}
            disabled={!signedIn}
            colors={colors}
          />
          <ChipGroup
            label="Primary market"
            options={MARKETS}
            value={market}
            onChange={(v) => { setMarket(v); setStatus(null); }}
            disabled={!signedIn}
            colors={colors}
          />
          <ChipGroup
            label="Primary marketing goal"
            options={GOALS}
            value={primaryGoal}
            onChange={(v) => { setPrimaryGoal(v); setStatus(null); }}
            disabled={!signedIn}
            colors={colors}
          />

          {signedIn && (
            <Pressable
              onPress={handleSave}
              disabled={!complete || saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !complete || saving ? 0.5 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                {saving ? 'Saving…' : 'Save workspace profile'}
              </Text>
            </Pressable>
          )}

          {signedIn && !firmContext && !seeded.current && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              No firm profile on your account yet — pick your practice, size, and goal.
            </Text>
          )}

          {status && (
            <View style={styles.statusRow}>
              <Feather name={status.ok ? 'check-circle' : 'alert-circle'} size={13} color={status.ok ? '#4BAF8A' : '#ef4444'} />
              <Text style={[styles.statusText, { color: status.ok ? '#4BAF8A' : '#ef4444' }]}>{status.text}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: 20, gap: 12 },
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  noteText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 16,
  },
  cardIntro: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  group: { gap: 8 },
  groupLabel: { fontSize: 10, letterSpacing: EYEBROW_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 },
});
