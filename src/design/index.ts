/**
 * NigraanOS Design System — Public API
 *
 * Single entry point for all design tokens and reusable components.
 *
 * Usage:
 *   import { colors, spacing, Button, Card, StatusBadge, Icon } from '@/src/design';
 */

// ── Tokens ───────────────────────────────────────────────────────

export { colors } from './tokens/colors';
export type { ColorToken } from './tokens/colors';

export { typography } from './tokens/typography';
export type { TextStyleName, TypographyToken } from './tokens/typography';

export { spacing, touchTarget } from './tokens/spacing';
export type { SpacingToken } from './tokens/spacing';

export { radius } from './tokens/radius';
export type { RadiusToken } from './tokens/radius';

export { shadows } from './tokens/shadows';
export type { ShadowToken } from './tokens/shadows';

// ── Components ───────────────────────────────────────────────────

export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { StatusBadge } from './components/StatusBadge';
export type { IncidentStatus, StatusBadgeProps } from './components/StatusBadge';

export { Icon, iconMap } from './components/Icon';
export type { IconName, IconProps } from './components/Icon';

export { FormField } from './components/FormField';
export type { FormFieldProps } from './components/FormField';
