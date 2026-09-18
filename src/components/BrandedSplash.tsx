import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../design';

/**
 * Branded splash — shown while the auth session restores.
 *
 * Deep Forest field, gold wordmark, and a subtle three-dot pulse.
 * Displays only for as long as session restoration actually takes;
 * there is no artificial delay.
 */
export function BrandedSplash() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 450,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [makeLoop(dot1, 0), makeLoop(dot2, 180), makeLoop(dot3, 360)];
    animations.forEach((a) => a.start());

    return () => animations.forEach((a) => a.stop());
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.screen} accessibilityLabel="NigraanOS is starting">
      {/* Soft concentric rings — the civic watch motif */}
      <View style={styles.ringOuter} pointerEvents="none" />
      <View style={styles.ringInner} pointerEvents="none" />

      <View style={styles.brandBlock}>
        <View style={styles.markBadge}>
          <Text style={styles.markLetter}>N</Text>
        </View>
        <Text style={styles.wordmark}>NigraanOS</Text>
        <Text style={styles.tagline}>Civic intelligence for your city</Text>
      </View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  ringOuter: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.14)',
  },
  ringInner: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.20)',
  },
  brandBlock: {
    alignItems: 'center',
  },
  markBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  markLetter: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.accent,
    includeFontPadding: false,
  },
  wordmark: {
    ...typography.styles.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.styles.bodySmall,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing['4xl'],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
