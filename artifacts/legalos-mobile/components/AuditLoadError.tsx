import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * Full-screen failure state for a signed-in user whose audit fetch failed.
 * This screen is the ONLY thing standing between them and silently-rendered
 * demo data — DataProvider shows it INSTEAD of the app whenever the demo
 * firm is what would otherwise render (loadError set + no real data yet).
 * Signed-out demo browsing never reaches it: loadError requires a session.
 */
export function AuditLoadError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Feather name="cloud-off" size={36} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Couldn't load your data
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Your firm's latest numbers failed to load, so there's nothing real
          to show yet. Check your connection and try again.
        </Text>
        <Pressable
          onPress={onRetry}
          disabled={isRetrying}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: isRetrying ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {isRetrying ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              Try again
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 600,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    paddingHorizontal: 24,
    minWidth: 200,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});
