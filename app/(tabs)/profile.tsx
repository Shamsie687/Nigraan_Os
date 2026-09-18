import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Icon, colors, radius, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';
import { ProtectedScreen } from '../../src/components/SignInGate';

/**
 * Profile screen — user account and settings.
 *
 * Displays the user's profile from the profiles table and provides
 * a sign-out action.
 *
 * Future content: contribution stats, trust level, language preference,
 * notification settings, and account management.
 *
 * Requires authentication — shows sign-in gate for unauthenticated users.
 */
export default function ProfileScreen() {
  return (
    <ProtectedScreen
      title="Your profile"
      message="Sign in to manage your profile, view contribution history, and adjust notification preferences."
      icon="person"
    >
      <ProfileContent />
    </ProtectedScreen>
  );
}

/**
 * Authenticated profile content — only rendered when signed in.
 */
function ProfileContent() {
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* ── User info ─────────────────────────────────────── */}
        <Card padding="lg" style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Icon name="person" size={32} color={colors.primary} />
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? 'User'}
          </Text>
          {profile?.email ? (
            <Text style={styles.email}>{profile.email}</Text>
          ) : null}
          {profile?.phone ? (
            <Text style={styles.phone}>{profile.phone}</Text>
          ) : null}
        </Card>

        {/* ── Placeholder content ──────────────────────────── */}
        <View style={styles.infoSection}>
          <Text style={styles.infoHeading}>Your account</Text>
          <Text style={styles.infoText}>
            Manage your profile, view contribution history, and adjust
            notification preferences here.
          </Text>
        </View>

        {/* ── Sign out ─────────────────────────────────────── */}
        <View style={styles.actions}>
          <Button
            label="Sign out"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => signOut()}
          />
          <Text style={styles.signOutHint}>
            You can sign back in anytime with your email or phone number.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing['2xl'],
  },

  // User card
  userCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  displayName: {
    ...typography.styles.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xs'],
  },
  phone: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Info section
  infoSection: {
    gap: spacing.sm,
  },
  infoHeading: {
    ...typography.styles.heading,
    color: colors.text,
  },
  infoText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Actions
  actions: {
    marginTop: 'auto' as unknown as number,
    paddingBottom: spacing.xl,
  },
  signOutHint: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
