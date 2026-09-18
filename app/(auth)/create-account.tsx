/**
 * Create Account Screen
 *
 * Account creation with full name and email. The current
 * authentication architecture is passwordless — accounts are
 * identified by email and backed by a Supabase anonymous identity,
 * so no password fields are shown and no credentials are stored.
 *
 * On success, the root navigator routes the new account into
 * profile setup before entering the app.
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

export default function CreateAccountScreen() {
  const router = useRouter();
  const { createLocalAccount } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateName(): boolean {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError('Please enter your full name');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Name must be 50 characters or less');
      return false;
    }
    setNameError(null);
    return true;
  }

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

  const handleCreateAccount = async () => {
    setFormError(null);
    const nameValid = validateName();
    const emailValid = validateEmail();
    if (!nameValid || !emailValid) return;

    setLoading(true);
    const { error: createError } = await createLocalAccount(displayName.trim(), email.trim());
    setLoading(false);

    if (createError) {
      // Log the full error (not just the message) so connectivity
      // failures can be diagnosed from the console
      console.error('[CreateAccount] Account setup failed:', createError);
      setFormError(createError.message);
    }
    // On success, the auth context marks the profile incomplete and the
    // root navigator routes into profile setup before entering the app
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

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Join NigraanOS and start making a difference in your community.
          </Text>

          {/* ── Form ─────────────────────────────────────────── */}
          <View style={styles.form}>
            <FormField
              label="Full name"
              icon="person"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (nameError) setNameError(null);
                if (formError) setFormError(null);
              }}
              placeholder="Your full name"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              editable={!loading}
              error={nameError}
              accessibilityLabel="Full name"
            />

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
              onSubmitEditing={handleCreateAccount}
              editable={!loading}
              error={emailError}
              hint="No password needed — this build signs you in with your email."
              accessibilityLabel="Email address"
            />

            {formError && (
              <View style={styles.errorBanner}>
                <Icon name="error" size={16} color={colors.error} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Button
              label="Create account"
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || !displayName.trim() || !email.trim()}
              onPress={handleCreateAccount}
            />
          </View>

          {/* ── Footer ─────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable
              onPress={() => router.replace({ pathname: '/(auth)/sign-in' as any })}
              accessibilityRole="button"
              accessibilityLabel="Sign in to existing account"
            >
              <Text style={styles.footerLink}>Sign in</Text>
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
