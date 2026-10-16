/**
 * Battle Plan partner review — mobile port of the web's PartnerReview.tsx.
 *
 * A single-purpose, expiring link a partner opens with NO login: the link id
 * is the bearer token. Read-only except for a text comment or an approve,
 * no nav chrome — same posture as the web page. This screen is opened by
 * EXTERNAL partners who may have zero app context, so it's written to be
 * self-explanatory (branded header, plain-language subhead, clean
 * loading/error/expired states).
 *
 * Voice notes: the web offers a recorder; mobile intentionally SKIPS voice
 * recording and posts text comments only (see note in the composer). Existing
 * comments that carry a voice note are marked as such rather than played.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { BrandRow } from '@/components/BrandRow';
import {
  approvePartnerItem,
  loadPartnerReview,
  postPartnerComment,
  type ReviewComment,
  type ReviewItem,
} from '@/lib/partnerReview';
import { EYEBROW_FONT_FAMILY, EYEBROW_TIGHT_TRACKING } from '@/constants/typography';

type Screen = 'loading' | 'ready' | 'error';

function formatDate(raw: string): string {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString();
}

function ItemCard({
  item,
  comments,
  linkId,
  submitting,
  onMutated,
  onSubmitting,
}: {
  item: ReviewItem;
  comments: ReviewComment[];
  linkId: string;
  submitting: string | null;
  onMutated: () => Promise<void>;
  onSubmitting: (id: string | null) => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState('');
  const busy = submitting === item.id;
  const itemComments = comments.filter((c) => c.item_id === item.id);

  const handleComment = async () => {
    const body = draft.trim();
    if (!body) return;
    onSubmitting(item.id);
    try {
      await postPartnerComment(linkId, item.id, body);
      setDraft('');
      await onMutated();
    } catch (e) {
      Alert.alert('Comment not sent', e instanceof Error ? e.message : "Couldn't post the comment.");
    } finally {
      onSubmitting(null);
    }
  };

  const handleApprove = () => {
    Alert.alert('Approve this item?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          onSubmitting(item.id);
          try {
            await approvePartnerItem(linkId, item.id);
            await onMutated();
          } catch (e) {
            Alert.alert('Not approved', e instanceof Error ? e.message : "Couldn't approve.");
          } finally {
            onSubmitting(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
      {item.description ? (
        <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>{item.status.replace('_', ' ')}</Text>
        {item.due_date ? (
          <Text style={[styles.due, { color: colors.mutedForeground }]}>· Due {formatDate(item.due_date)}</Text>
        ) : null}
      </View>

      {itemComments.length > 0 && (
        <View style={styles.comments}>
          {itemComments.map((c) => (
            <View key={c.id} style={[styles.comment, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.commentAuthor, { color: colors.mutedForeground }]}>{c.author_label}</Text>
              {c.body ? <Text style={[styles.commentBody, { color: colors.foreground }]}>{c.body}</Text> : null}
              {c.voice_note_data_url ? (
                <View style={styles.voiceRow}>
                  <Feather name="mic" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.voiceNote, { color: colors.mutedForeground }]}>
                    Voice note (open on the web to listen)
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          editable={!busy}
        />
        <View style={styles.actions}>
          <Pressable
            onPress={handleComment}
            disabled={busy || !draft.trim()}
            style={[styles.commentBtn, { borderColor: colors.border, opacity: busy || !draft.trim() ? 0.4 : 1 }]}
          >
            <Feather name="message-square" size={13} color={colors.foreground} />
            <Text style={[styles.commentBtnText, { color: colors.foreground }]}>Comment</Text>
          </Pressable>
          {item.status === 'in_review' && (
            <Pressable
              onPress={handleApprove}
              disabled={busy}
              style={[styles.approveBtn, { opacity: busy ? 0.4 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="check-circle" size={13} color="#ffffff" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function PartnerReviewScreen() {
  const { linkId } = useLocalSearchParams<{ linkId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>('loading');
  const [error, setError] = useState('');
  const [recipientLabel, setRecipientLabel] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!linkId) {
      setError('This review link is missing its id.');
      setScreen('error');
      return;
    }
    try {
      const board = await loadPartnerReview(linkId);
      setRecipientLabel(board.recipientLabel);
      setItems(board.items);
      setComments(board.comments);
      setScreen('ready');
    } catch (e) {
      // Expired/invalid links land here — the edge function returns the
      // human message; we show it as a clean dead-end state rather than a
      // crash or a silent empty board.
      setError(e instanceof Error ? e.message : "Couldn't load this review link.");
      setScreen('error');
    }
  }, [linkId]);

  useEffect(() => {
    load();
  }, [load]);

  if (screen === 'loading') {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (screen === 'error') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingHorizontal: 24 }]}>
        <BrandRow />
        <View style={[styles.centered, { flex: 1 }]}>
          <Feather name="x-circle" size={28} color={colors.destructive} style={{ marginBottom: 16 }} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>This link isn't available</Text>
          <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>{error}</Text>
          <Text style={[styles.errorHint, { color: colors.mutedForeground }]}>
            Review links expire after a set number of days. Ask the firm that sent it for a fresh link.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <BrandRow />

        <View style={styles.eyebrowRow}>
          <Feather name="shield" size={13} color={colors.primary} />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PARTNER REVIEW</Text>
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>
          {recipientLabel ? `For ${recipientLabel}` : 'Review these items'}
        </Text>
        <Text style={[styles.subhead, { color: colors.mutedForeground }]}>
          Comment or approve directly from your phone — no account needed.
        </Text>

        {items.length === 0 ? (
          <Text style={[styles.subhead, { color: colors.mutedForeground, marginTop: 24 }]}>
            There are no items to review on this link right now.
          </Text>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                comments={comments}
                linkId={linkId as string}
                submitting={submitting}
                onMutated={load}
                onSubmitting={setSubmitting}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  eyebrow: { fontSize: 10, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY },
  heading: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginBottom: 4 },
  subhead: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  list: { marginTop: 20, gap: 12 },
  card: { borderWidth: 1, borderRadius: 6, padding: 16 },
  itemTitle: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 21 },
  itemDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  status: { fontSize: 10, letterSpacing: EYEBROW_TIGHT_TRACKING, fontFamily: EYEBROW_FONT_FAMILY, textTransform: 'uppercase' },
  due: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  comments: { marginTop: 12, gap: 6 },
  comment: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  commentAuthor: { fontSize: 10, fontFamily: 'Inter_500Medium', marginBottom: 3 },
  commentBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  voiceNote: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  composer: { marginTop: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    minHeight: 48,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 8 },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  commentBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  approveBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#ffffff' },
  errorTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.4, marginBottom: 8, textAlign: 'center' },
  errorBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, textAlign: 'center', marginBottom: 12 },
  errorHint: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, textAlign: 'center' },
});
