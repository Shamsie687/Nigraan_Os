/**
 * NigraanOS Typography Tokens
 *
 * Uses system fonts for zero-cost loading and native feel.
 * Scale is designed for readability at all sizes with
 * generous line heights for accessibility.
 */

const fontFamily = {
  /** Primary typeface — system font stack */
  regular: 'System',
  /** Emphasis and headings */
  medium: 'System',
  bold: 'System',
} as const;

const fontSize = {
  /** Caption, fine print */
  xs: 12,
  /** Body secondary, labels */
  sm: 14,
  /** Body primary */
  base: 16,
  /** Section headings, list titles */
  md: 18,
  /** Page sub-headings */
  lg: 20,
  /** Page titles */
  xl: 24,
  /** Hero / display */
  '2xl': 32,
  /** Large display */
  '3xl': 40,
} as const;

const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

const lineHeight = {
  /** Tight — headings */
  tight: 20,
  /** Normal — body text */
  normal: 24,
  /** Relaxed — secondary text, captions */
  relaxed: 28,
  /** Large — display text */
  large: 36,
  /** Extra large */
  xl: 44,
} as const;

const letterSpacing = {
  /** Tight — headings */
  tight: -0.5,
  /** Normal — body */
  normal: 0,
  /** Wide — uppercase labels */
  wide: 0.5,
} as const;

// ── Composed Typography Styles ───────────────────────────────────

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,

  /** Pre-composed text styles for direct use in StyleSheet */
  styles: {
    displayLarge: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.xl,
      letterSpacing: letterSpacing.tight,
    },
    display: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.large,
      letterSpacing: letterSpacing.tight,
    },
    heading: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.large,
      letterSpacing: letterSpacing.tight,
    },
    subheading: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.relaxed,
      letterSpacing: letterSpacing.normal,
    },
    title: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    body: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    bodyMedium: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
    bodySmall: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.relaxed,
      letterSpacing: letterSpacing.normal,
    },
    caption: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.wide,
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.normal,
    },
    button: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.normal,
      letterSpacing: letterSpacing.normal,
    },
  },
} as const;

export type TypographyToken = keyof typeof typography;
export type TextStyleName = keyof typeof typography.styles;
