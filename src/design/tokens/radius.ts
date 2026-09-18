/**
 * NigraanOS Border Radius Tokens
 *
 * Consistent corner rounding across the interface.
 * Values increase for larger surface areas.
 */

export const radius = {
  /** No rounding */
  none: 0,
  /** Small elements — tags, chips */
  sm: 4,
  /** Inputs, small buttons */
  md: 8,
  /** Cards, standard containers */
  lg: 12,
  /** Large cards, modals */
  xl: 16,
  /** Panels, bottom sheets */
  '2xl': 24,
  /** Full round — avatars, circular buttons */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
