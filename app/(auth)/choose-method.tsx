import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Icon, colors, radius, spacing, typography } from '../../src/design';

/**
 * Auth method chooser screen.
 *
 * Presents two authentication paths:
 * - Continue with Email — fully functional (sends email OTP)
 * - Continue with Phone — shown as coming soon (SMS provider not yet configured)
 */
export default function ChooseMethodScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* ── Back button ──────────────────────────────────────── */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.content}>
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text style={styles.heading}>Choose how to sign in</Text>
          <Text style={styles.subheading}>
            Verify your identity to start reporting civic issues
            and tracking progress in your area.
          </Text>
        </View>

        {/* ── Options ────────────────────────────────────────── */}
        <View style={styles.optionsSection}>
          {/* Email — active */}
          <Button
            label="Continue with Email"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/email')}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Phone — coming soon */}
          <View style={styles.disabledOption}>
            <Pressable
              style={styles.disabledButton}
              disabled
              accessibilityRole="button"
              accessibilityLabel="Continue with Phone (coming soon)"
              accessibilityState={{ disabled: true }}
            >
              <Icon name="phone" size={18} color={colors.textTertiary} />
              <Text style={styles.disabledLabel}>Continue with Phone</Text>
            </Pressable>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
        </View>

        {/* ── Privacy note ───────────────────────────────────── */}
        <View style={styles.privacySection}>
          <Icon name="lock" size={14} color={colors.primary} style={styles.privacyIcon} />
          <Text style={styles.privacyText}>
            Your credentials are used only for verification.
            We never share your personal information.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Back
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.full,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Header
  headerSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  heading: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subheading: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Options
  optionsSection: {
    gap: spacing.xl,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    ...typography.styles.bodySmall,
    color: colors.textTertiary,
  },

  // Disabled option
  disabledOption: {
    gap: spacing.sm,
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    opacity: 0.6,
  },
  disabledLabel: {
    ...typography.styles.bodyMedium,
    color: colors.textTertiary,
  },
  comingSoonBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing['2xs'],
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  comingSoonText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Privacy
  privacySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing['3xl'],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
  },
  privacyIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  privacyText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
});
