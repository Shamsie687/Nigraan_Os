import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Icon, colors, radius, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';

// ── Constants ──────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * OTP verification screen — supports both email and phone-based verification.
 *
 * Reads either `phone` or `email` from route params to determine which
 * verification method to use. Displays a 6-digit code input with:
 * - Auto-focus on mount
 * - Resend countdown timer (60s for Supabase rate limits)
 * - Loading state during verification
 * - Error handling for invalid/expired codes and network failures
 *
 * Calls Supabase verifyOtp to establish the authenticated session.
 */
export default function OtpScreen() {
  const router = useRouter();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const { verifyOtp, verifyEmailOtp, signInWithPhone, signInWithEmail } = useAuth();
  const inputRef = useRef<TextInput>(null);

  // Determine the verification mode
  const isEmailMode = !!email;
  const contactValue = email ?? phone ?? '';

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  // ── Resend timer ─────────────────────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Auto-focus on mount ──────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // ── Verify code ──────────────────────────────────────────────

  const handleVerify = useCallback(
    async (otpCode: string) => {
      if (otpCode.length !== OTP_LENGTH || !contactValue) return;

      setIsLoading(true);
      setError('');

      // Use the correct verification method based on mode
      const { error: verifyError } = isEmailMode
        ? await verifyEmailOtp(contactValue, otpCode)
        : await verifyOtp(contactValue, otpCode);

      if (verifyError) {
        setIsLoading(false);
        // Map Supabase errors to user-friendly messages
        if (verifyError.message.includes('expired') || verifyError.message.includes('too old')) {
          setError('Code expired. Please request a new code.');
        } else if (verifyError.message.includes('invalid')) {
          setError('Invalid code. Please check and try again.');
        } else if (verifyError.message.includes('rate limit')) {
          setError('Too many attempts. Please wait and try again.');
        } else {
          setError('Verification failed. Please check your connection and try again.');
        }
        setCode('');
        // Re-focus input
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // Success — auth state listener will update context,
      // navigate to profile-setup with the contact identifier
      setIsLoading(false);
      router.replace({
        pathname: '/(auth)/profile-setup',
        params: isEmailMode ? { email: contactValue } : { phone: contactValue },
      });
    },
    [contactValue, isEmailMode, router, verifyOtp, verifyEmailOtp],
  );

  // ── Handle code change ───────────────────────────────────────

  function handleChangeCode(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
    if (error) setError('');

    // Auto-verify when all digits are entered
    if (cleaned.length === OTP_LENGTH) {
      handleVerify(cleaned);
    }
  }

  // ── Resend ───────────────────────────────────────────────────

  async function handleResend() {
    if (resendCooldown > 0 || !contactValue) return;

    setIsResending(true);
    setError('');

    // Use the correct resend method based on mode
    const { error: sendError } = isEmailMode
      ? await signInWithEmail(contactValue)
      : await signInWithPhone(contactValue);

    setIsResending(false);

    if (sendError) {
      if (sendError.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Unable to resend code. Please check your connection.');
      }
      return;
    }

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setCode('');
    inputRef.current?.focus();
  }

  // ── Format contact for display ───────────────────────────────

  const displayContact = isEmailMode
    ? (email ?? 'your email')
    : (phone ?? '+92XXXXXXXXXX');

  const deliveryChannel = isEmailMode ? 'email' : 'SMS';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          <Text style={styles.heading}>Enter verification code</Text>
          <Text style={styles.subheading}>
            We sent a 6-digit code via {deliveryChannel} to{' '}
            <Text style={styles.contactHighlight}>{displayContact}</Text>
          </Text>

          {/* ── OTP input ──────────────────────────────────────── */}
          <Pressable
            style={styles.otpContainer}
            onPress={() => inputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Enter verification code"
          >
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const digit = code[index] ?? '';
              const isActive = index === code.length && !isLoading;
              const isError = error.length > 0;

              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    isActive && styles.otpBoxActive,
                    isError && styles.otpBoxError,
                    digit && styles.otpBoxFilled,
                  ]}
                >
                  <Text
                    style={[
                      styles.otpDigit,
                      isError && { color: colors.error },
                    ]}
                  >
                    {digit}
                  </Text>
                </View>
              );
            })}

            {/* Hidden TextInput that captures keyboard */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleChangeCode}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              maxLength={OTP_LENGTH}
              editable={!isLoading}
              caretHidden
              accessibilityLabel="Verification code input"
            />
          </Pressable>

          {/* ── Error message ──────────────────────────────────── */}
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="error" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ── Loading indicator ──────────────────────────────── */}
          {isLoading && (
            <Text style={styles.loadingText}>Verifying…</Text>
          )}

          {/* ── Resend ─────────────────────────────────────────── */}
          <View style={styles.resendSection}>
            {resendCooldown > 0 ? (
              <Text style={styles.resendTimer}>
                Resend code in {resendCooldown}s
              </Text>
            ) : (
              <Pressable
                onPress={handleResend}
                disabled={isResending}
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
              >
                <Text style={[styles.resendLink, isResending && styles.resendLinkDisabled]}>
                  {isResending ? 'Sending…' : `Didn't receive a code? Resend`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Verify button ──────────────────────────────────── */}
        <View style={styles.footer}>
          <Button
            label="Verify"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={code.length !== OTP_LENGTH || isLoading}
            onPress={() => handleVerify(code)}
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
    paddingTop: spacing.lg,
  },

  // Header
  heading: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.styles.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing['2xl'],
  },
  contactHighlight: {
    ...typography.styles.bodyMedium,
    color: colors.text,
  },

  // OTP input
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    position: 'relative',
    marginBottom: spacing.xl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  otpDigit: {
    ...typography.styles.heading,
    color: colors.text,
    fontSize: typography.fontSize.xl,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: 0,
    left: 0,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.styles.bodySmall,
    color: colors.error,
  },

  // Loading
  loadingText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Resend
  resendSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resendTimer: {
    ...typography.styles.bodySmall,
    color: colors.textTertiary,
  },
  resendLink: {
    ...typography.styles.bodyMedium,
    color: colors.primary,
  },
  resendLinkDisabled: {
    color: colors.textTertiary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
