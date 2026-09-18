/**
 * NigraanOS Spacing Tokens — 8px Base System
 *
 * All spacing values are multiples of 8px to maintain
 * visual rhythm and consistency across the interface.
 *
 * Usage:
 *   padding: spacing.md     // 16
 *   margin: spacing.lg      // 24
 *   gap: spacing.sm         // 8
 */

export const spacing = {
  /** 0px — no spacing */
  none: 0,
  /** 2px — micro adjustments, icon-to-text tightening */
  '2xs': 2,
  /** 4px — tight inline gaps */
  xs: 4,
  /** 8px — compact spacing, icon gaps, tight padding */
  sm: 8,
  /** 12px — small component padding */
  md: 12,
  /** 16px — standard component padding, card padding */
  lg: 16,
  /** 20px — section spacing */
  xl: 20,
  /** 24px — comfortable section gaps */
  '2xl': 24,
  /** 32px — major section separation */
  '3xl': 32,
  /** 40px — large section separation */
  '4xl': 40,
  /** 48px — page vertical padding */
  '5xl': 48,
  /** 64px — hero sections, large breaks */
  '6xl': 64,
} as const;

/**
 * Touch target sizes — meet WCAG 2.5.5 minimum (44×44pt).
 */
export const touchTarget = {
  /** Minimum touch target — WCAG AA */
  min: 44,
  /** Comfortable touch target — WCAG AAA recommended */
  comfortable: 48,
  /** Large touch target — primary action buttons */
  large: 56,
} as const;

export type SpacingToken = keyof typeof spacing;
