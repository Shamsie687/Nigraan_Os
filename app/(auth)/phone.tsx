import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Icon, colors, radius, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';

/**
 * Phone number entry screen.
 *
 * Collects the user's phone number for OTP verification.
 * Explains why phone verification is needed in a non-intrusive way.
 * Defaults to Pakistan (+92) country code.
 *
 * Calls Supabase signInWithOtp to send the verification SMS.
 */
export default function PhoneScreen() {
  const router = useRouter();
  const { signInWithPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const digitsOnly = phone.replace(/\D/g, '');
  const isValid = digitsOnly.length >= 10 && digitsOnly.length <= 11;

  async function handleContinue() {
    if (!isValid) {
      setError('Please enter a valid phone number (10–11 digits).');
      return;
    }
    setError('');
    setIsLoading(true);

    const fullPhone = `+92${digitsOnly}`;
    const { error: sendError } = await signInWithPhone(fullPhone);

    setIsLoading(false);

    if (sendError) {
      // Map common Supabase errors to user-friendly messages
      if (sendError.message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (sendError.message.includes('invalid')) {
        setError('Invalid phone number. Please check and try again.');
      } else {
        setError('Unable to send verification code. Please check your connection and try again.');
      }
      return;
    }

    // Success — navigate to OTP screen with phone number
    router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone } });
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
              <Icon name="microphone" size={28} color={colors.primary} />
            </View>
            <Text style={styles.heading}>Verify your phone number</Text>
            <Text style={styles.subheading}>
              We use your phone number to verify your identity and send you
              updates about civic issues in your area. We will never share
              your number or use it for marketing.
            </Text>
          </View>

          {/* ── Phone input ────────────────────────────────────── */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone number</Text>
            <View style={[styles.phoneRow, error ? styles.phoneRowError : null]}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+92</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (error) setError('');
                }}
                placeholder="3XX XXXXXXX"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                autoComplete="tel"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!isLoading}
                accessibilityLabel="Phone number"
              />
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hintText}>
                You will receive a 6-digit verification code via SMS.
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
            disabled={(!isValid && digitsOnly.length > 0) || isLoading}
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  phoneRowError: {
    borderColor: colors.error,
  },
  countryCode: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    height: '100%',
    justifyContent: 'center',
  },
  countryCodeText: {
    ...typography.styles.bodyMedium,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    ...typography.styles.body,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    height: 52,
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
