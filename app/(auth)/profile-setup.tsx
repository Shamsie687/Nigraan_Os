/**
 * Profile Setup Screen
 *
 * Final step of onboarding before entering the app. Collects a
 * display name and offers a location permission request using the
 * real Expo Location API.
 *
 * The detected area is shown from actual reverse-geocoded data only —
 * nothing is fabricated, and location permission is optional: the
 * user can continue without it.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Button, FormField, Icon, colors, radius, shadows, spacing, typography } from '../../src/design';
import { useAuth } from '../../src/services/auth';

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [permission, setPermission] = useState<PermissionState>('idle');
  const [detectedArea, setDetectedArea] = useState<string | null>(null);

  const accountEmail = user?.email ?? '';

  // ── Location permission ────────────────────────────────────────

  const handleRequestLocation = async () => {
    setPermission('requesting');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermission('denied');
        return;
      }

      // Permission granted — read the real position and reverse-geocode it.
      // If either step fails we still show the granted state, just without
      // an area label (never a fabricated neighborhood).
      setPermission('granted');

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const area = [addr.subregion, addr.city].filter(Boolean).join(', ');
          if (area) setDetectedArea(area);
        }
      } catch {
        // Reverse geocoding unavailable — detectedArea stays null
      }
    } catch {
      setPermission('denied');
    }
  };

  // ── Validation & submit ────────────────────────────────────────

  function validateName(): boolean {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setNameError('Display name must be at least 2 characters.');
      return false;
    }
    if (trimmed.length > 50) {
      setNameError('Display name must be 50 characters or less.');
      return false;
    }
    setNameError(null);
    return true;
  }

  async function handleComplete() {
    if (!validateName()) return;

    setIsSubmitting(true);
    setSubmitError('');

    const { error } = await updateProfile({
      displayName: displayName.trim(),
      email: accountEmail,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError('Unable to save your profile. Please try again.');
      return;
    }

    // Success — the root navigator detects profile completion and
    // redirects into the app
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <View style={styles.headerSection}>
            <Text style={styles.heading}>Profile setup</Text>
            <Text style={styles.subheading}>
              Choose a display name for your reports. This is how other citizens
              and authorities will see you — your real name is never shared
              publicly.
            </Text>
          </View>

          {/* ── Form ───────────────────────────────────────────── */}
          <View style={styles.formSection}>
            <FormField
              label="Display name"
              icon="person"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g., Ahmed K."
              autoComplete="name"
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleComplete}
              editable={!isSubmitting}
              error={nameError}
              hint="This will appear on your public reports."
              accessibilityLabel="Display name"
            />

            {accountEmail ? (
              <View style={styles.emailRow}>
                <Icon name="email" size={15} color={colors.textTertiary} />
                <Text style={styles.emailText} numberOfLines={1}>
                  {accountEmail}
                </Text>
              </View>
            ) : null}

            {/* ── Location permission ────────────────────────── */}
            <View style={styles.locationCard}>
              <View style={styles.locationCardHeader}>
                <View style={styles.locationIconBadge}>
                  <Icon name="location" size={17} color={colors.primary} />
                </View>
                <View style={styles.locationHeaderText}>
                  <Text style={styles.locationTitle}>Location access</Text>
                  <Text style={styles.locationSubtitle}>
                    Helps place your reports on the map and show nearby issues.
                  </Text>
                </View>
              </View>

              {permission === 'idle' && (
                <Button
                  label="Enable location"
                  variant="secondary"
                  size="md"
                  onPress={handleRequestLocation}
                />
              )}

              {permission === 'requesting' && (
                <View style={styles.permissionPending}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.permissionPendingText}>
                    Asking for permission…
                  </Text>
                </View>
              )}

              {permission === 'granted' && (
                <View style={styles.permissionResult}>
                  <View style={styles.permissionResultRow}>
                    <Icon name="check" size={15} color={colors.success} />
                    <Text style={styles.permissionSuccessText}>
                      Location enabled
                    </Text>
                  </View>
                  {detectedArea ? (
                    <View style={styles.areaRow}>
                      <Icon name="map" size={14} color={colors.textTertiary} />
                      <Text style={styles.areaText}>Detected area: {detectedArea}</Text>
                    </View>
                  ) : (
                    <Text style={styles.areaNote}>
                      Your area will be read when you submit a report.
                    </Text>
                  )}
                </View>
              )}

              {permission === 'denied' && (
                <View style={styles.permissionResult}>
                  <View style={styles.permissionResultRow}>
                    <Icon name="info" size={15} color={colors.warning} />
                    <Text style={styles.permissionDeniedText}>
                      Location permission denied
                    </Text>
                  </View>
                  <Text style={styles.areaNote}>
                    No problem — you can still report issues. Enable location
                    later from your phone's settings for map placement.
                  </Text>
                </View>
              )}
            </View>

            {/* Privacy note */}
            <View style={styles.privacyNote}>
              <Icon name="lock" size={14} color={colors.primary} />
              <Text style={styles.privacyText}>
                Your email is kept private and used only for account-related
                updates. Location is attached to reports you choose to submit.
              </Text>
            </View>

            {/* Submit error */}
            {submitError ? (
              <View style={styles.submitErrorRow}>
                <Icon name="error" size={14} color={colors.error} />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* ── Complete button ──────────────────────────────────── */}
        <View style={styles.footer}>
          <Button
            label="Done"
            variant="accent"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={displayName.trim().length < 2 || isSubmitting}
            onPress={handleComplete}
          />
          <Text style={styles.footerNote}>
            By continuing you agree to NigraanOS terms of service and privacy policy.
          </Text>
        </View>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  // Header
  headerSection: {
    paddingBottom: spacing['2xl'],
  },
  heading: {
    ...typography.styles.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.text,
    marginBottom: spacing.md,
  },
  subheading: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Form
  formSection: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: -spacing.md,
  },
  emailText: {
    ...typography.styles.bodySmall,
    color: colors.textTertiary,
    flex: 1,
  },

  // Location card
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  locationIconBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationHeaderText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  locationTitle: {
    ...typography.styles.title,
    color: colors.text,
  },
  locationSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  permissionPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  permissionPendingText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  permissionResult: {
    gap: spacing.sm,
  },
  permissionResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionSuccessText: {
    ...typography.styles.label,
    color: colors.success,
  },
  permissionDeniedText: {
    ...typography.styles.label,
    color: colors.warning,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  areaText: {
    ...typography.styles.bodySmall,
    color: colors.text,
    flex: 1,
  },
  areaNote: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Privacy
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
  },
  privacyText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Submit error
  submitErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: radius.lg,
  },
  submitErrorText: {
    ...typography.styles.bodySmall,
    color: colors.error,
    flex: 1,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerNote: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: typography.lineHeight.relaxed,
  },
});
