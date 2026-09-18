import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing, touchTarget } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { shadows } from '../tokens/shadows';

// ── Types ────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  /** Button label */
  label: string;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size scale */
  size?: ButtonSize;
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Optional left icon element */
  iconLeft?: React.ReactNode;
  /** Optional right icon element */
  iconRight?: React.ReactNode;
  /** Full-width button */
  fullWidth?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

// ── Variant Styles ───────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: string }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    text: colors.textOnPrimary,
  },
  accent: {
    container: {
      backgroundColor: colors.accent,
      borderWidth: 0,
    },
    text: colors.textOnAccent,
  },
  secondary: {
    container: {
      backgroundColor: colors.primaryLight,
      borderWidth: 0,
    },
    text: colors.primary,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    text: colors.primary,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    text: colors.primary,
  },
  danger: {
    container: {
      backgroundColor: colors.error,
      borderWidth: 0,
    },
    text: colors.textOnPrimary,
  },
};

// ── Size Styles ──────────────────────────────────────────────────

const sizeStyles = {
  sm: {
    container: {
      height: touchTarget.min,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
    },
    text: typography.styles.label,
  },
  md: {
    container: {
      height: touchTarget.comfortable,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.md,
    },
    text: typography.styles.button,
  },
  lg: {
    container: {
      height: touchTarget.large,
      paddingHorizontal: spacing['2xl'],
      borderRadius: radius.lg,
    },
    text: { ...typography.styles.button, fontSize: typography.fontSize.md },
  },
};

// ── Component ────────────────────────────────────────────────────

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    style,
    ...pressableProps
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle.container,
        variantStyle.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyle.text}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
          <Text style={[sizeStyle.text, { color: variantStyle.text }]}>
            {label}
          </Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </Pressable>
  );
});

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
  fullWidth: {
    width: '100%',
  },
});
