import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/radius';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

// ── Types ────────────────────────────────────────────────────────

/**
 * Incident lifecycle status.
 * Must match shared/types/incident.ts — kept local to avoid
 * cross-layer import coupling in UI components.
 */
export type IncidentStatus =
  | 'REPORTED'
  | 'AI_ANALYZED'
  | 'CORROBORATED'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

type BadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  /** Incident lifecycle status */
  status: IncidentStatus;
  /** Size variant */
  size?: BadgeSize;
  /** Optional custom label override */
  label?: string;
}

// ── Status Config ────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  color: string;
  backgroundColor: string;
  dot: string;
}

const statusConfig: Record<IncidentStatus, StatusConfig> = {
  REPORTED: {
    label: 'Reported',
    color: colors.statusReported,
    backgroundColor: colors.statusReportedBg,
    dot: '○',
  },
  AI_ANALYZED: {
    label: 'AI Analyzed',
    color: colors.statusAiAnalyzed,
    backgroundColor: colors.statusAiAnalyzedBg,
    dot: '◉',
  },
  CORROBORATED: {
    label: 'Corroborated',
    color: colors.statusCorroborated,
    backgroundColor: colors.statusCorroboratedBg,
    dot: '◎',
  },
  VERIFIED: {
    label: 'Verified',
    color: colors.statusVerified,
    backgroundColor: colors.statusVerifiedBg,
    dot: '✓',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: colors.statusInProgress,
    backgroundColor: colors.statusInProgressBg,
    dot: '⟳',
  },
  RESOLVED: {
    label: 'Resolved',
    color: colors.statusResolved,
    backgroundColor: colors.statusResolvedBg,
    dot: '✓',
  },
  REJECTED: {
    label: 'Rejected',
    color: colors.statusRejected,
    backgroundColor: colors.statusRejectedBg,
    dot: '✕',
  },
};

// ── Component ────────────────────────────────────────────────────

export function StatusBadge({ status, size = 'md', label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.dot,
          { color: config.color },
          isSmall && styles.dotSmall,
        ]}
      >
        {config.dot}
      </Text>
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSmall && styles.labelSmall,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
  },
  dot: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  dotSmall: {
    fontSize: 10,
    marginRight: spacing['2xs'],
  },
  label: {
    ...typography.styles.label,
    fontWeight: typography.fontWeight.semibold,
  },
  labelSmall: {
    fontSize: typography.fontSize.xs,
  },
});
