/**
 * Welcome Screen
 *
 * Entry point for unauthenticated users. Presents NigraanOS with a
 * civic street-grid motif and an English / اردو language switcher
 * that re-renders the visible copy on this screen.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Icon, colors, radius, shadows, spacing, typography } from '../../src/design';

type Language = 'en' | 'ur';

// ── Bilingual copy ────────────────────────────────────────────────

const COPY = {
  en: {
    tagline: 'Civic intelligence for your city.\nReport issues. Track progress. Verify resolutions.',
    features: [
      { icon: 'report' as const, text: 'Report civic issues with photos and location' },
      { icon: 'bell' as const, text: 'Stay informed about issues in your area' },
      { icon: 'verified' as const, text: 'Track progress from report to resolution' },
    ],
    createAccount: 'Create account',
    signIn: 'Sign in',
    freeNote: 'Free for every citizen. Your reports stay yours.',
  },
  ur: {
    tagline: 'آپ کے شہر کے لیے شہری انٹیلی جنس۔\nمسائل رپورٹ کریں۔ پیش رفت دیکھیں۔ تصدیق کریں۔',
    features: [
      { icon: 'report' as const, text: 'تصویر اور مقام کے ساتھ شہری مسائل رپورٹ کریں' },
      { icon: 'bell' as const, text: 'اپنے علاقے کے مسائل سے آگاہ رہیں' },
      { icon: 'verified' as const, text: 'رپورٹ سے حل تک پیش رفت کی پیروی کریں' },
    ],
    createAccount: 'اکاؤنٹ بنائیں',
    signIn: 'سائن ان کریں',
    freeNote: 'ہر شہری کے لیے مفت۔ آپ کی رپورٹس آپ کی ہی رہتی ہیں۔',
  },
} as const;

// ── Screen ────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const copy = COPY[language];
  const isUrdu = language === 'ur';
  const rtlText = isUrdu ? { writingDirection: 'rtl' as const, textAlign: 'right' as const } : null;

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Language switcher ─────────────────────────────────── */}
      <View style={styles.langRow}>
        <View
          style={styles.langSwitch}
          accessibilityRole="tablist"
          accessibilityLabel="Language"
        >
          <LanguageOption
            label="English"
            active={language === 'en'}
            onPress={() => setLanguage('en')}
          />
          <LanguageOption
            label="اردو"
            active={language === 'ur'}
            onPress={() => setLanguage('ur')}
          />
        </View>
      </View>

      {/* ── Brand ─────────────────────────────────────────────── */}
      <View style={styles.brandSection}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.brandName}>NigraanOS</Text>
        <Text style={[styles.tagline, rtlText]}>{copy.tagline}</Text>
      </View>

      {/* ── Civic motif ───────────────────────────────────────── */}
      <View style={styles.motifWrap}>
        <View style={styles.motifCard}>
          <View style={styles.motifGrid} pointerEvents="none">
            <View style={[styles.gridLineH, { top: '30%' }]} />
            <View style={[styles.gridLineH, { top: '62%' }]} />
            <View style={[styles.gridLineV, { left: '26%' }]} />
            <View style={[styles.gridLineV, { left: '68%' }]} />
            <View style={[styles.gridPin, { top: '18%', left: '58%' }]} />
            <View style={[styles.gridPin, { top: '54%', left: '20%' }]} />
            <View style={[styles.gridPin, { top: '70%', left: '74%' }]} />
          </View>
          <View style={[styles.motifChips, isUrdu && styles.motifChipsRtl]}>
            <MotifChip icon="water" />
            <MotifChip icon="electricity" />
            <MotifChip icon="road" />
            <MotifChip icon="delete" />
          </View>
        </View>
      </View>

      {/* ── Features ──────────────────────────────────────────── */}
      <View style={styles.featuresSection}>
        {copy.features.map((feature) => (
          <View
            key={feature.text}
            style={[styles.featureRow, isUrdu && styles.featureRowRtl]}
          >
            <View style={styles.featureIconCircle}>
              <Icon name={feature.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, rtlText, isUrdu && styles.featureTextUr]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Actions ───────────────────────────────────────────── */}
      <View style={styles.actionSection}>
        <Button
          label={copy.createAccount}
          variant="accent"
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/(auth)/create-account' as any })}
        />
        <View style={styles.actionSpacer} />
        <Button
          label={copy.signIn}
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: '/(auth)/sign-in' as any })}
        />
        <Text style={[styles.freeNote, isUrdu && styles.freeNoteUr]}>{copy.freeNote}</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function LanguageOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.langOption, active && styles.langOptionActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label === 'اردو' ? 'Urdu' : 'English'}
    >
      <Icon
        name="globe"
        size={13}
        color={active ? colors.textOnPrimary : colors.textSecondary}
      />
      <Text style={[styles.langText, active && styles.langTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MotifChip({ icon }: { icon: 'water' | 'electricity' | 'road' | 'delete' }) {
  return (
    <View style={styles.motifChip}>
      <Icon name={icon} size={13} color={colors.primary} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },

  // Language switcher
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.full,
  },
  langOptionActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    ...typography.styles.label,
    color: colors.textSecondary,
  },
  langTextActive: {
    color: colors.textOnPrimary,
  },

  // Brand
  brandSection: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
    includeFontPadding: false,
  },
  brandName: {
    ...typography.styles.heading,
    fontSize: typography.fontSize['2xl'],
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },

  // Civic motif
  motifWrap: {
    alignItems: 'center',
  },
  motifCard: {
    width: '100%',
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadows.sm,
  },
  motifGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(15, 76, 58, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(15, 76, 58, 0.08)',
  },
  gridPin: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  motifChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  motifChipsRtl: {
    flexDirection: 'row-reverse',
  },
  motifChip: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  // Features
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureRowRtl: {
    flexDirection: 'row-reverse',
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...typography.styles.body,
    color: colors.text,
    flex: 1,
  },
  featureTextUr: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
    textAlign: 'right',
  },

  // Actions
  actionSection: {
    paddingBottom: spacing.xl,
  },
  actionSpacer: {
    height: spacing.md,
  },
  freeNote: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  freeNoteUr: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
});
