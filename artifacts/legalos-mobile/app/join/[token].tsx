/**
 * Firm-invite redemption — mobile port of the web's JoinFirm.tsx.
 *
 * A shareable-link invite: whoever holds the token and is signed in joins the
 * firm. Redemption requires a real session (identity is verified server-side
 * with no anonymous fallback), so an unauthenticated visitor is sent to
 * sign-in with the token stashed for resume — sign-in routes back here after
 * auth (see lib/pendingJoin + app/(auth)/sign-in). Contract mirrors
 * JoinFirm.tsx, not its desktop layout.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { BrandRow } from '@/components/BrandRow';
import { redeemFirmInvite } from '@/lib/firmInvite';
import { setPendingJoinToken } from '@/lib/pendingJoin';

type Status = 'checking' | 'needs-signin' | 'redeeming' | 'success' | 'error';

export default function JoinFirmScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, session, isLoading } = useAuth();

  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');
  const [firmName, setFirmName] = useState('');
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to settle so a persisted session isn't mistaken for a
    // signed-out visitor (which would bounce them to sign-in needlessly).
    if (isLoading) return;
    if (!token) {
      setStatus('error');
      setMessage('This invite link is missing its token.');
      return;
    }
    if (!user || !session?.access_token) {
      setStatus('needs-signin');
      return;
    }
    // Attempt once per identity+token per mount: the effect re-runs whenever
    // the session object changes, and a second redeem after a successful one
    // would surface the server's "already used" as a bogus error wall.
    const attemptKey = `${user.id}:${token}`;
    if (attemptedRef.current === attemptKey) return;
    attemptedRef.current = attemptKey;
    setStatus('redeeming');
    let cancelled = false;
    (async () => {
      const result = await redeemFirmInvite(session.access_token, token);
      if (cancelled) return;
      if (result.ok) {
        setFirmName(result.firmName);
        setStatus('success');
      } else {
        setMessage(result.error);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, session?.access_token, token]);

  const goSignIn = async () => {
    if (token) await setPendingJoinToken(token);
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.brandBlock}>
        <BrandRow />
      </View>

      <View style={styles.center}>
        {(status === 'checking' || status === 'redeeming') && (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 16 }]}>Joining the firm…</Text>
          </>
        )}

        {status === 'needs-signin' && (
          <>
            <Feather name="users" size={28} color={colors.primary} style={styles.icon} />
            <Text style={[styles.title, { color: colors.foreground }]}>Sign in first</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              You'll need an account to accept this invite. Sign in or create one — we'll bring you right back here to
              finish joining.
            </Text>
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={goSignIn}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Go to sign in</Text>
            </Pressable>
          </>
        )}

        {status === 'success' && (
          <>
            <Feather name="check-circle" size={28} color={colors.primary} style={styles.icon} />
            <Text style={[styles.title, { color: colors.foreground }]}>You're in</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              You've joined <Text style={{ color: colors.foreground }}>{firmName}</Text>. Your dashboard now shows the
              firm's shared Market Visibility history.
            </Text>
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Go to your dashboard</Text>
            </Pressable>
          </>
        )}

        {status === 'error' && (
          <>
            <Feather name="x-circle" size={28} color={colors.destructive} style={styles.icon} />
            <Text style={[styles.title, { color: colors.foreground }]}>Couldn't join</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{message}</Text>
            <Pressable style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => router.replace('/(tabs)')}>
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Back to the app</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  brandBlock: { marginBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2 },
  secondaryBtn: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
