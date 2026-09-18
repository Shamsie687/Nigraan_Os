import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing, touchTarget } from '../tokens/spacing';
import { typography } from '../tokens/typography';

// ── Types ────────────────────────────────────────────────────────

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  /** Field label shown above the input */
  label: string;
  /** Optional leading icon */
  icon?: IconName;
  /** Validation error — outlines the field and shows a message */
  error?: string | null;
  /** Helper text shown below the input when there is no error */
  hint?: string | null;
  /** Mark the label as optional */
  optional?: boolean;
  /** Trailing element rendered inside the input row (e.g. visibility toggle) */
  trailing?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────

/**
 * FormField — the standard NigraanOS text input.
 *
 * White surface, 1.5px border, focus ring in primary, and inline
 * error/hint rows. All auth and civic forms use this for consistency.
 */
export function FormField({
  label,
  icon,
  error,
  hint,
  optional,
  trailing,
  editable = true,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
          editable === false && styles.inputRowDisabled,
        ]}
      >
        {icon ? (
          <Icon
            name={icon}
            size={17}
            color={focused ? colors.primary : error ? colors.error : colors.textTertiary}
          />
        ) : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          selectionColor={colors.primary}
          {...inputProps}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Icon name="error" size={13} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  label: {
    ...typography.styles.label,
    color: colors.text,
  },
  optional: {
    ...typography.styles.bodySmall,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: touchTarget.large,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputRowDisabled: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    ...typography.styles.body,
    color: colors.text,
    paddingVertical: 0,
  },
  trailing: {
    minWidth: touchTarget.min,
    alignItems: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    ...typography.styles.caption,
    color: colors.error,
    flex: 1,
  },
  hintText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
});
