/**
 * Forgot Password Screen
 *
 * Honest recovery for a passwordless architecture: NigraanOS accounts
 * in this build do not use passwords, so nothing is "reset" and no
 * email is claimed to be sent. The screen verifies whether an account
 * exists for the entered email and directs the user to the right
 * next step (direct sign in, or account creation).
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, FormField, Icon, colors, radius, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CheckState = 'idle' | 'checking' | 'found' | 'notFound';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { checkAccountExists } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [checkedEmail, setCheckedEmail] = useState('');

  function validateEmail(): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Please enter your email address');
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  }

  const handleCheck = async () => {
    if (!validateEmail()) return;

    setCheckState('checking');
    const exists = await checkAccountExists(email.trim());
    setCheckedEmail(email.trim());
    setCheckState(exists ? 'found' : 'notFound');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ───────────────────────────────────────────── */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="back" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Good news — NigraanOS doesn't use passwords in this build. Enter
            your email and we'll check whether an account exists for you.
          </Text>

          {/* ── Form ─────────────────────────────────────────── */}
          {checkState !== 'found' && checkState !== 'notFound' ? (
            <View style={styles.form}>
              <FormField
                label="Email"
                icon="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCheck}
                editable={checkState !== 'checking'}
                error={emailError}
                accessibilityLabel="Email address"
              />

              <Button
                label={checkState === 'checking' ? 'Checking…' : 'Check my account'}
                variant="accent"
                size="lg"
                fullWidth
                loading={checkState === 'checking'}
                disabled={checkState === 'checking' || !email.trim()}
                onPress={handleCheck}
              />
            </View>
          ) : checkState === 'found' ? (
            /* ── Account exists — passwordless sign in works ── */
            <View style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: colors.successLight }]}>
                <Icon name="check" size={22} color={colors.success} />
              </View>
              <Text style={styles.resultTitle}>Your account is ready</Text>
              <Text style={styles.resultBody}>
                An account exists for {checkedEmail}. Since this build has no
                passwords, you can sign in directly with your email — nothing
                to reset.
              </Text>
              <Button
                label="Back to sign in"
                variant="accent"
                size="lg"
                fullWidth
                onPress={() => router.replace({ pathname: '/(auth)/sign-in' as any })}
              />
            </View>
          ) : (
            /* ── No account — offer creation ── */
            <View style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: colors.warningLight }]}>
                <Icon name="info" size={22} color={colors.warning} />
              </View>
              <Text style={styles.resultTitle}>No account found</Text>
              <Text style={styles.resultBody}>
                We couldn't find an account for {checkedEmail}. Create one in
                under a minute — no password needed.
              </Text>
              <Button
                label="Create account"
                variant="accent"
                size="lg"
                fullWidth
                onPress={() => router.replace({ pathname: '/(auth)/create-account' as any })}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
    marginLeft: -spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },

  // Content
  title: {
    ...typography.styles.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
    lineHeight: typography.lineHeight.relaxed,
  },

  // Form
  form: {
    gap: spacing.lg,
  },

  // Result cards
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    ...typography.styles.title,
    color: colors.text,
  },
  resultBody: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
  },
});
