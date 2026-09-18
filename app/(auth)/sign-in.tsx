/**
 * Sign In Screen
 *
 * Email-based sign in for existing local accounts.
 * The current authentication architecture is passwordless —
 * accounts are identified by email and backed by a Supabase
 * anonymous identity, so no password field is shown.
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

export default function SignInScreen() {
  const router = useRouter();
  const { signInLocal } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSignIn = async () => {
    setFormError(null);
    if (!validateEmail()) return;

    setLoading(true);
    const { error: signInError } = await signInLocal(email.trim());
    setLoading(false);

    if (signInError) {
      setFormError(signInError.message);
    }
    // On success, the auth context state change redirects into the app
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

          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Welcome back. Enter the email you used to create your account.
          </Text>

          {/* ── Form ─────────────────────────────────────────── */}
          <View style={styles.form}>
            <FormField
              label="Email"
              icon="email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(null);
                if (formError) setFormError(null);
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              editable={!loading}
              error={emailError}
              accessibilityLabel="Email address"
            />

            {/* Forgot password — the flow is passwordless, the screen explains honestly */}
            <View style={styles.forgotRow}>
              <Pressable
                onPress={() => router.push({ pathname: '/(auth)/forgot-password' as any })}
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
                hitSlop={8}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>

            {formError && (
              <View style={styles.errorBanner}>
                <Icon name="error" size={16} color={colors.error} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Button
              label="Sign in"
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || !email.trim()}
              onPress={handleSignIn}
            />
          </View>

          {/* ── Footer ─────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable
              onPress={() => router.replace({ pathname: '/(auth)/create-account' as any })}
              accessibilityRole="button"
              accessibilityLabel="Create a new account"
            >
              <Text style={styles.footerLink}>Create account</Text>
            </Pressable>
          </View>
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
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -spacing.xs,
  },
  forgotLink: {
    ...typography.styles.label,
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error,
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
    paddingTop: spacing.xl,
  },
  footerText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
