/**
 * NigraanOS Color Tokens — Light Theme
 *
 * Design intent: trustworthy, calm, premium, civic.
 * Deep Forest primary with a warm Gold accent — a restrained,
 * institutional palette that reads as serious civic technology.
 *
 * Semantic names are used instead of raw color references so that
 * a future dark theme can remap tokens without changing consumers.
 */

// ── Brand ────────────────────────────────────────────────────────

const brand = {
  /** Deepest forest — splash backgrounds, dark surfaces */
  green900: '#0A3327',
  /** Deep Forest — primary brand */
  green800: '#0F4C3A',
  /** Hover / pressed state */
  green700: '#0C3E30',
  /** Lighter interactive surfaces */
  green600: '#1A5F49',
  /** Tinted backgrounds, tags */
  green100: '#E7EFEA',
  /** Faint tinted wash */
  green50: '#F2F7F4',

  /** Gold accent — premium, trust */
  gold600: '#C18F45',
  gold500: '#D4A359',
  gold100: '#F8EFDE',
} as const;

// ── Neutrals ─────────────────────────────────────────────────────

const neutral = {
  /** Darkest text, near-black */
  gray950: '#0F172A',
  /** Primary text */
  gray900: '#0F172A',
  /** Secondary text */
  gray600: '#475569',
  /** Tertiary / disabled text */
  gray400: '#94A3B8',
  /** Borders, dividers */
  gray200: '#E2E8F0',
  /** Light borders */
  gray100: '#EEF2F6',
  /** Surface backgrounds */
  gray50: '#F8F9FA',
  /** Pure white */
  white: '#FFFFFF',
} as const;

// ── Semantic ─────────────────────────────────────────────────────

const semantic = {
  /** Destructive actions, critical severity */
  error: '#D32F2F',
  errorLight: '#FDECEC',
  /** Warnings, high severity */
  warning: '#E65100',
  warningLight: '#FFF3E0',
  /** Success, resolved state */
  success: '#10B981',
  successLight: '#E7F8F1',
  /** Informational, in-progress */
  info: '#1565C0',
  infoLight: '#E3F2FD',
  /** Low severity, neutral */
  low: '#5F6368',
  lowLight: '#F1F3F4',
} as const;

// ── Composed Semantic Tokens ─────────────────────────────────────

export const colors = {
  // Surfaces
  background: neutral.gray50,
  surface: neutral.white,
  surfaceElevated: neutral.white,

  // Text
  text: neutral.gray900,
  textSecondary: neutral.gray600,
  textTertiary: neutral.gray400,
  textInverse: neutral.white,
  textOnPrimary: neutral.white,
  /** Text on gold accent surfaces — dark forest for contrast */
  textOnAccent: '#0E3B2C',

  // Brand
  primary: brand.green800,
  primaryDeep: brand.green900,
  primaryPressed: brand.green700,
  primaryLight: brand.green100,
  accent: brand.gold500,
  accentPressed: brand.gold600,
  accentLight: brand.gold100,

  // UI
  border: neutral.gray200,
  borderLight: neutral.gray100,
  divider: neutral.gray100,

  // Feedback
  error: semantic.error,
  errorLight: semantic.errorLight,
  warning: semantic.warning,
  warningLight: semantic.warningLight,
  success: semantic.success,
  successLight: semantic.successLight,
  info: semantic.info,
  infoLight: semantic.infoLight,

  // Status-specific (maps to IncidentStatus)
  statusReported: '#5F6368',
  statusReportedBg: '#F1F3F4',
  statusAiAnalyzed: '#7B1FA2',
  statusAiAnalyzedBg: '#F3E5F5',
  statusCorroborated: '#1565C0',
  statusCorroboratedBg: '#E3F2FD',
  statusVerified: '#00838F',
  statusVerifiedBg: '#E0F7FA',
  statusInProgress: '#E65100',
  statusInProgressBg: '#FFF3E0',
  statusResolved: '#1B5E20',
  statusResolvedBg: '#E8F5E9',
  statusRejected: '#D32F2F',
  statusRejectedBg: '#FFEBEE',

  // Raw palettes (for custom usage)
  brand,
  neutral,
  semantic,
} as const;

export type ColorToken = keyof typeof colors;
