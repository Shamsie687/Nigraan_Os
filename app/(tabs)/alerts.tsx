/**
 * Civic Alerts Screen
 *
 * A public-facing civic awareness experience showing important alerts.
 * Alerts are distinct from incidents — they communicate things users
 * should know about, not just reported issues.
 *
 * All data is MOCK for the product-skeleton stage.
 */

import { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  Icon,
  colors,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
  type IconName,
} from '../../src/design';
import {
  ALERT_CATEGORY_CONFIG,
  ALERT_SEVERITY_CONFIG,
  ALERT_STATUS_CONFIG,
  MOCK_ALERTS,
  getCriticalAlerts,
  getNearbyAlerts,
  type MockAlert,
  type AlertCategory,
  type AlertSeverity,
  type AlertStatus,
} from '../../src/data/mock-alerts';

// ── Filter Types ─────────────────────────────────────────────────

type AlertFilter = 'all' | 'nearby' | 'critical' | 'following';

const FILTER_OPTIONS: { value: AlertFilter; label: string; isMock?: boolean }[] = [
  { value: 'all', label: 'All' },
  { value: 'nearby', label: 'Nearby', isMock: true },
  { value: 'critical', label: 'Critical' },
  { value: 'following', label: 'Following', isMock: true },
];

// ── Main Screen ──────────────────────────────────────────────────

export default function AlertsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<AlertFilter>('all');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    switch (selectedFilter) {
      case 'nearby':
        return getNearbyAlerts();
      case 'critical':
        return getCriticalAlerts();
      case 'following':
        // Mock: return empty for now (no following data)
        return [];
      default:
        return MOCK_ALERTS;
    }
  }, [selectedFilter]);

  const activeCount = MOCK_ALERTS.filter((a) => a.status !== 'resolved').length;
  const criticalCount = MOCK_ALERTS.filter(
    (a) => a.severity === 'critical' || a.severity === 'high'
  ).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Civic Alerts</Text>
            <Text style={styles.subtitle}>
              {activeCount} active alerts in your area
            </Text>
          </View>
          {criticalCount > 0 && (
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalBadgeText}>{criticalCount} urgent</Text>
            </View>
          )}
        </View>

        {/* ── Filter Chips ──────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = selectedFilter === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSelectedFilter(option.value);
                  setExpandedAlertId(null);
                }}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={option.label}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {option.isMock && (
                  <View style={styles.soonIndicator}>
                    <Text style={styles.soonIndicatorText}>SOON</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Alert List ──────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAlerts.length === 0 ? (
          <EmptyState filter={selectedFilter} />
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isExpanded={expandedAlertId === alert.id}
              onToggle={() =>
                setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)
              }
            />
          ))
        )}

        {/* ── Source Indicator ───────────────────────────────── */}
        <View style={styles.sourceFooter}>
          <Icon name="info" size={14} color={colors.textTertiary} />
          <Text style={styles.sourceText}>
            NigraanOS civic intelligence
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Alert Card Component ─────────────────────────────────────────

function AlertCard({
  alert,
  isExpanded,
  onToggle,
}: {
  alert: MockAlert;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const categoryConfig = ALERT_CATEGORY_CONFIG[alert.category];
  const severityConfig = ALERT_SEVERITY_CONFIG[alert.severity];
  const statusConfig = ALERT_STATUS_CONFIG[alert.status];

  return (
    <Card padding="none" elevation="sm" style={styles.alertCard}>
      {/* Severity indicator bar */}
      <View style={[styles.severityBar, { backgroundColor: severityConfig.color }]} />

      <Pressable
        onPress={onToggle}
        style={styles.alertContent}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${alert.title}. ${severityConfig.label} priority. ${statusConfig.label}.`}
      >
        {/* Header row */}
        <View style={styles.alertHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryConfig.color + '15' }]}>
            <Icon name={categoryConfig.icon} size={18} color={categoryConfig.color} />
          </View>
          <View style={styles.alertHeaderContent}>
            <View style={styles.alertMetaRow}>
              <View style={[styles.severityTag, { backgroundColor: severityConfig.bgColor }]}>
                <Text style={[styles.severityTagText, { color: severityConfig.color }]}>
                  {severityConfig.label}
                </Text>
              </View>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={styles.alertTitle} numberOfLines={2}>
              {alert.title}
            </Text>
          </View>
          <Icon
            name={isExpanded ? 'menu' : 'forward'}
            size={16}
            color={colors.textTertiary}
            style={styles.expandIcon}
          />
        </View>

        {/* Quick info row */}
        <View style={styles.quickInfoRow}>
          <Icon name="location" size={12} color={colors.textSecondary} />
          <Text style={styles.areaText} numberOfLines={1}>
            {alert.affectedArea}
          </Text>
        </View>
        <View style={styles.quickInfoRow}>
          <Icon name="clock" size={12} color={colors.textTertiary} />
          <Text style={styles.timeText}>{alert.reportedAgo}</Text>
          {alert.isNearby && (
            <View style={styles.nearbyBadge}>
              <Text style={styles.nearbyText}>NEARBY</Text>
            </View>
          )}
        </View>

        {/* Expanded content */}
        {isExpanded && (
          <ExpandedContent
            alert={alert}
            categoryIcon={categoryConfig.icon}
            categoryColor={categoryConfig.color}
            categoryLabel={categoryConfig.label}
          />
        )}
      </Pressable>
    </Card>
  );
}

// ── Expanded Content ─────────────────────────────────────────────

function ExpandedContent({
  alert,
  categoryIcon,
  categoryColor,
  categoryLabel,
}: {
  alert: MockAlert;
  categoryIcon: IconName;
  categoryColor: string;
  categoryLabel: string;
}) {
  return (
    <View style={styles.expandedSection}>
      {/* What's happening */}
      <View style={styles.expandedBlock}>
        <Text style={styles.expandedLabel}>What's happening</Text>
        <Text style={styles.expandedText}>{alert.explanation}</Text>
      </View>

      {/* Category */}
      <View style={styles.expandedBlock}>
        <Text style={styles.expandedLabel}>Category</Text>
        <View style={styles.categoryBadge}>
          <Icon name={categoryIcon} size={12} color={categoryColor} />
          <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
            {categoryLabel}
          </Text>
        </View>
      </View>

      {/* Guidance */}
      <View style={styles.guidanceBlock}>
        <View style={styles.guidanceLabelRow}>
          <Text style={styles.expandedLabel}>What should I do?</Text>
        </View>
        <View style={styles.guidanceContent}>
          <Icon name="info" size={16} color={colors.primary} />
          <Text style={styles.guidanceText}>{alert.guidance}</Text>
        </View>
      </View>

      {/* Type distinction */}
      <View style={styles.typeIndicator}>
        <Icon name="alert" size={14} color={colors.textTertiary} />
        <Text style={styles.typeText}>
          This is a civic alert — awareness information for citizens, not a reported incident.
        </Text>
      </View>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────

function EmptyState({ filter }: { filter: AlertFilter }) {
  return (
    <View style={styles.emptyState}>
      <Icon name="info" size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {filter === 'following' ? 'Following feature coming soon' : 'No alerts found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'following'
          ? 'Follow specific areas or categories to get personalized alerts.'
          : 'Check back later or try a different filter.'}
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing['2xs'],
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  criticalBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  criticalBadgeText: {
    ...typography.styles.caption,
    color: colors.error,
    fontWeight: '600',
  },

  // Filters
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.styles.label,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  soonIndicator: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
  },
  soonIndicatorText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.5,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Alert Card
  alertCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  severityBar: {
    height: 4,
  },
  alertContent: {
    padding: spacing.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertHeaderContent: {
    flex: 1,
  },
  alertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  severityTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.sm,
  },
  severityTagText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  statusText: {
    ...typography.styles.caption,
    fontWeight: '500',
  },
  alertTitle: {
    ...typography.styles.title,
    color: colors.text,
    lineHeight: 22,
  },
  expandIcon: {
    marginTop: spacing.xs,
  },
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  areaText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  timeText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  nearbyBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  nearbyText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 0.5,
  },

  // Expanded Section
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  expandedBlock: {
    gap: spacing.xs,
  },
  expandedLabel: {
    ...typography.styles.label,
    color: colors.textSecondary,
  },
  expandedText: {
    ...typography.styles.bodySmall,
    color: colors.text,
    lineHeight: typography.lineHeight.relaxed,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  categoryBadgeText: {
    ...typography.styles.caption,
    fontWeight: '500',
  },

  // Guidance
  guidanceBlock: {
    gap: spacing.xs,
  },
  guidanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guidanceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  guidanceText: {
    ...typography.styles.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Type indicator
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  typeText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    flex: 1,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.styles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Source Footer
  sourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sourceText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
});
