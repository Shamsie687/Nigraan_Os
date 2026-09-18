import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { shadows } from '../tokens/shadows';

// ── Types ────────────────────────────────────────────────────────

export interface CardProps extends ViewProps {
  /** Elevation level */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** Remove border (elevation-only card) */
  borderless?: boolean;
}

const paddingMap = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

// ── Component ────────────────────────────────────────────────────

export function Card({
  elevation = 'sm',
  padding = 'md',
  borderless = false,
  style,
  children,
  ...viewProps
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        shadows[elevation],
        { padding: paddingMap[padding] },
        borderless && styles.borderless,
        style,
      ]}
      {...viewProps}
    >
      {children}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  borderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
});
