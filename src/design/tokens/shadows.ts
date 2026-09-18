/**
 * NigraanOS Shadow Tokens
 *
 * Subtle elevation system for depth hierarchy.
 * Designed to feel calm and premium — not dramatic.
 *
 * React Native shadow properties (iOS) + elevation (Android).
 */

import { ViewStyle } from 'react-native';

export const shadows: Record<string, ViewStyle> = {
  /** No shadow — flat surfaces */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  /** Subtle lift — cards, list items */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  /** Moderate lift — floating cards, dropdowns */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  /** Strong lift — modals, bottom sheets */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export type ShadowToken = keyof typeof shadows;
