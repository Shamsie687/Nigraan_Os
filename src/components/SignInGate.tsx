import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Icon, colors, radius, spacing, typography } from '../design';

// ── SignInGate ───────────────────────────────────────────────────

interface SignInGateProps {
  /** Title shown on the gate screen */
  title: string;
  /** Explanatory message below the title */
  message: string;
  /** Icon displayed at the top (design system IconName) */
  icon: string;
}

/**
 * SignInGate — full-screen sign-in prompt shown when an
 * unauthenticated user tries to access a protected action.
 *
 * Presents a clear explanation and a primary CTA that navigates
 * to the auth flow. After successful authentication, the root
 * navigator redirects the user back to the tabs group.
 */
export function SignInGate({ title, message, icon }: SignInGateProps) {
  const router = useRouter();

  return (
    <View style={styles.gateContainer}>
      <View style={styles.gateContent}>
        <View style={styles.gateIconCircle}>
          <Icon name={icon as any} size={28} color={colors.primary} />
        </View>

        <Text style={styles.gateTitle}>{title}</Text>
        <Text style={styles.gateMessage}>{message}</Text>

        <View style={styles.gateActions}>
          <Button
            label="Sign in"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/welcome')}
          />
          <Text style={styles.gateHint}>
            Free for all Pakistani citizens. No spam, ever.
          </Text>
        </View>
      </View>

      <View style={styles.gatePrivacy}>
        <Icon name="info" size={14} color={colors.primary} />
        <Text style={styles.gatePrivacyText}>
          Sign in to unlock this feature. Your data stays private.
        </Text>
      </View>
    </View>
  );
}

// ── ProtectedScreen ──────────────────────────────────────────────

import type { ReactNode } from 'react';
import { useAuth } from '../services/auth';

interface ProtectedScreenProps {
  /** The protected content to render when authenticated */
  children: ReactNode;
  /** Gate title shown to unauthenticated users */
  title: string;
  /** Gate message explaining why auth is needed */
  message: string;
  /** Icon for the gate screen */
  icon: string;
}

/**
 * ProtectedScreen — wrapper that shows a sign-in gate when the user
 * is not authenticated, or renders the protected content otherwise.
 *
 * Usage:
 *   <ProtectedScreen title="Report" message="..." icon="✎">
 *     <ActualScreenContent />
 *   </ProtectedScreen>
 */
export function ProtectedScreen({
  children,
  title,
  message,
  icon,
}: ProtectedScreenProps) {
  const { status } = useAuth();

  if (status !== 'authenticated') {
    return <SignInGate title={title} message={message} icon={icon} />;
  }

  return <>{children}</>;
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  gateContent: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  gateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  gateTitle: {
    ...typography.styles.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  gateMessage: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  gateActions: {
    width: '100%',
    gap: spacing.md,
  },
  gateHint: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  gatePrivacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
  },
  gatePrivacyText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },
});
