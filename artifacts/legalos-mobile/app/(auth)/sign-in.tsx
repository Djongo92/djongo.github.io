import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandRow } from '@/components/BrandRow';
import { takePendingJoinToken } from '@/lib/pendingJoin';

type Step = 'email' | 'code';

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputRef = useRef<TextInput>(null);
  const stepProgress = useSharedValue(0);

  // Animate step transition
  useEffect(() => {
    stepProgress.value = withSpring(step === 'code' ? 1 : 0, {
      mass: 1, damping: 20, stiffness: 120,
    });
  }, [step]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const emailSlide = useAnimatedStyle(() => ({
    opacity: withTiming(step === 'email' ? 1 : 0, { duration: 200 }),
    transform: [{ translateX: withSpring(step === 'email' ? 0 : -40) }],
  }));

  const codeSlide = useAnimatedStyle(() => ({
    opacity: withTiming(step === 'code' ? 1 : 0, { duration: 200 }),
    transform: [{ translateX: withSpring(step === 'code' ? 0 : 40) }],
  }));

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setError(null);
    const err = await signIn(trimmed);
    setLoading(false);
    if (err) {
      // "User not found" means no account — show a helpful message
      const msg = err.toLowerCase().includes('not found')
        ? 'No account found for this email. Sign up at app.legalos.rs first.'
        : err;
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('code');
    setResendCooldown(60);
    setTimeout(() => codeInputRef.current?.focus(), 300);
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    const err = await verifyOtp(email, code);
    setLoading(false);
    if (err) {
      setCode('');
      setError('Invalid or expired code. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Resume a firm-invite redemption the user opened before signing in:
    // route back to /join/<token> so it redeems against this fresh session.
    const pendingToken = await takePendingJoinToken();
    if (pendingToken) {
      router.replace(`/join/${pendingToken}`);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    const err = await signIn(email);
    setLoading(false);
    if (!err) setResendCooldown(60);
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        {/* Brand mark — the shared BrandRow treatment, so sign-in matches
            every post-login tab header rather than carrying its own logo. */}
        <View style={styles.brandBlock}>
          <BrandRow />
        </View>

        {/* Email step */}
        <Animated.View style={[styles.stepContainer, emailSlide, step !== 'email' && StyleSheet.absoluteFill]}>
          <Text style={[styles.headline, { color: colors.foreground }]}>Sign in</Text>
          <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
            Enter your email. We'll send a one-time code — no password needed.
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: error ? '#ef4444' : colors.border, color: colors.foreground },
              ]}
              placeholder="you@yourfirm.rs"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={t => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Continue</Text>
            }
          </Pressable>
        </Animated.View>

        {/* Code step */}
        <Animated.View style={[styles.stepContainer, codeSlide, step !== 'code' && StyleSheet.absoluteFill]}>
          <Text style={[styles.headline, { color: colors.foreground }]}>Check your email</Text>
          <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
            Enter the 6-digit code we sent to{'\n'}
            <Text style={{ color: colors.foreground }}>{email}</Text>
          </Text>

          {/* 6-box OTP input */}
          <View style={styles.otpWrapper}>
            <TextInput
              ref={codeInputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={t => {
                const digits = t.replace(/\D/g, '').slice(0, 6);
                if (digits.length > code.length) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setCode(digits);
                setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={false}
            />
            <Pressable style={styles.otpRow} onPress={() => codeInputRef.current?.focus()}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View
                  key={i}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: i === code.length ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.otpDigit, { color: colors.foreground }]}>
                    {code[i] ?? ''}
                  </Text>
                </View>
              ))}
            </Pressable>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

          <Pressable onPress={handleResend} disabled={resendCooldown > 0} style={styles.resendRow}>
            <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.mutedForeground : colors.primary }]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Text>
          </Pressable>

          <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} style={styles.backRow}>
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Change email</Text>
          </Pressable>
        </Animated.View>

        {/* Demo mode link */}
        <View style={styles.demoRow}>
          <Pressable onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.demoText, { color: colors.mutedForeground }]}>
              Browse in demo mode →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },
  // BrandRow carries its own 10dp bottom margin; this preserves the original
  // generous gap between the mark and the sign-in headline.
  brandBlock: { marginBottom: 50 },
  stepContainer: { flex: 1 },
  headline: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.8,
    marginBottom: 10,
    lineHeight: 40,
  },
  subtext: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 36,
  },
  inputGroup: { marginBottom: 12 },
  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  // OTP
  otpWrapper: { marginBottom: 12, alignItems: 'center' },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  otpBox: {
    width: 48,
    height: 60,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0,
  },
  resendRow: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  backRow: { alignItems: 'center', paddingVertical: 8 },
  backText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  // Demo
  demoRow: { alignItems: 'center', paddingTop: 40 },
  demoText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
