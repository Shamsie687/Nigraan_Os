import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Icon, colors, radius, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';

/**
 * Email entry screen.
 *
 * Collects the user's email address for OTP verification.
 * Calls Supabase signInWithOtp to send the verification email.
 * On success, navigates to the OTP screen with the email as a param.
 */
export default function EmailScreen() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const trimmed = email.trim();
  // Simple email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(trimmed);

  async function handleContinue() {
    if (!isValid) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setIsLoading(true);

    const { error: sendError } = await signInWithEmail(trimmed);

    setIsLoading(false);

    if (sendError) {
      // Map common Supabase errors to user-friendly messages
      if (sendError.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (sendError.message.includes('invalid') || sendError.message.includes('not valid')) {
        setError('Invalid email address. Please check and try again.');
      } else if (sendError.message.includes('signups not allowed') || sendError.message.includes('signups are not allowed')) {
        setError('Sign-ups are currently disabled. Please contact support.');
      } else {
        setError('Unable to send verification code. Please check your connection and try again.');
      }
      return;
    }

    // Success — navigate to OTP screen with email
    router.push({ pathname: '/(auth)/otp', params: { email: trimmed } });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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
            <View style={styles.iconCircle}>
              <Icon name="email" size={28} color={colors.primary} />
            </View>
            <Text style={styles.heading}>Verify your email</Text>
            <Text style={styles.subheading}>
              We will send a 6-digit verification code to your email
              address. This helps us confirm your identity and keep
              your account secure.
            </Text>
          </View>

          {/* ── Email input ────────────────────────────────────── */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={[
                styles.emailInput,
                error ? styles.emailInputError : null,
              ]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="your@email.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              editable={!isLoading}
              accessibilityLabel="Email address"
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hintText}>
                A verification code will be sent to this address.
              </Text>
            )}
          </View>
        </View>

        {/* ── Continue button ──────────────────────────────────── */}
        <View style={styles.footer}>
          <Button
            label="Send verification code"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={(!isValid && trimmed.length > 0) || isLoading}
            onPress={handleContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
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
    paddingBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
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

  // Input
  inputSection: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.styles.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emailInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 52,
    ...typography.styles.body,
    color: colors.text,
  },
  emailInputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.styles.caption,
    color: colors.error,
  },
  hintText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
