/**
 * My Activity Screen
 *
 * A personal civic tracking experience showing the user's submitted reports
 * and their current lifecycle status. Protected by authentication.
 *
 * Data source: Supabase incidents table, filtered by reporter_id = auth.uid().
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ProtectedScreen } from '../../src/components/SignInGate';
import {
  Card,
  Icon,
  StatusBadge,
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
  type IncidentStatus,
  type IconName,
} from '../../src/design';
import {
  CATEGORIES,
  toUiStatus,
  formatReportedAgo,
} from '../../src/constants/civic';
import {
  fetchUserIncidents,
  type IncidentRow,
  type IncidentCategory,
} from '../../src/services/incident';

// ── Lifecycle ────────────────────────────────────────────────────

const LIFECYCLE_ORDER: IncidentStatus[] = [
  'REPORTED',
  'AI_ANALYZED',
  'CORROBORATED',
  'VERIFIED',
  'IN_PROGRESS',
  'RESOLVED',
];

function getStatusIndex(status: IncidentStatus): number {
  if (status === 'REJECTED') return -1;
  const idx = LIFECYCLE_ORDER.indexOf(status);
  return idx >= 0 ? idx : -1;
}

// ── Filter Types ─────────────────────────────────────────────────

type ActivityFilter = 'all' | 'active' | 'resolved';

const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

// ── Main Screen ──────────────────────────────────────────────────

export default function ActivityScreen() {
  return (
    <ProtectedScreen
      title="Your activity"
      message="Sign in to track the progress of your reports and see updates on issues you've reported."
      icon="activity"
    >
      <ActivityContent />
    </ProtectedScreen>
  );
}

function ActivityContent() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<ActivityFilter>('all');
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await fetchUserIncidents();
    if (result.error) {
      setLoadError(result.error);
      setIncidents([]);
    } else {
      setIncidents(result.incidents);
    }
    setIsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Filter incidents
  const filteredIncidents = incidents.filter((inc) => {
    const uiStatus = toUiStatus(inc.status);
    switch (selectedFilter) {
      case 'active':
        return uiStatus !== 'RESOLVED' && uiStatus !== 'REJECTED';
      case 'resolved':
        return uiStatus === 'RESOLVED';
      default:
        return true;
    }
  });

  const activeCount = incidents.filter((inc) => {
    const s = toUiStatus(inc.status);
    return s !== 'RESOLVED' && s !== 'REJECTED';
  }).length;
  const resolvedCount = incidents.filter(
    (inc) => toUiStatus(inc.status) === 'RESOLVED',
  ).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>My Activity</Text>
        <Text style={styles.subtitle}>Track your submitted reports</Text>

        {/* ── Summary ───────────────────────────────────────── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.success }]}>
              {resolvedCount}
            </Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
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
                onPress={() => setSelectedFilter(option.value)}
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
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Reports List ────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadIncidents}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={loadIncidents} />
        ) : filteredIncidents.length === 0 ? (
          <EmptyState filter={selectedFilter} />
        ) : (
          filteredIncidents.map((incident) => (
            <ReportCard
              key={incident.id}
              incident={incident}
              onPress={() =>
                router.push({ pathname: '/incident/[id]', params: { id: incident.id } })
              }
            />
          ))
        )}

        {/* ── Trust Explanation ─────────────────────────────── */}
        {!isLoading && !loadError && (
          <View style={styles.trustFooter}>
            <Icon name="info" size={16} color={colors.info} />
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>About report statuses</Text>
              <Text style={styles.trustText}>
                &quot;Reported&quot; means your submission was received — not that it has been
                verified. NigraanOS uses a multi-step process: AI analysis, citizen
                corroboration, and authority verification before issues are acted upon.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Report Card Component ────────────────────────────────────────

function ReportCard({
  incident,
  onPress,
}: {
  incident: IncidentRow;
  onPress: () => void;
}) {
  const uiStatus = toUiStatus(incident.status);
  const catMeta = CATEGORIES[incident.category] ?? CATEGORIES.other;
  const isRejected = uiStatus === 'REJECTED';
  const reportedAgo = formatReportedAgo(incident.reported_at);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.reportCardWrapper,
        pressed && styles.reportCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${incident.title}. Status: ${uiStatus.replace(/_/g, ' ')}. Tap to view details.`}
    >
      <Card padding="lg" elevation="sm" style={styles.reportCard}>
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: catMeta.color + '15' }]}>
            <Icon name={catMeta.icon} size={16} color={catMeta.color} />
          </View>
          <View style={styles.reportHeaderContent}>
            <Text style={styles.reportTitle} numberOfLines={1}>
              {incident.title}
            </Text>
            <Text style={styles.reportCategory} numberOfLines={1}>
              {catMeta.label}
            </Text>
          </View>
          <Icon name="forward" size={14} color={colors.textTertiary} />
        </View>

        {/* Status + Time */}
        <View style={styles.statusRow}>
          <StatusBadge status={uiStatus} size="sm" />
          <View style={styles.timeRow}>
            <Icon name="clock" size={12} color={colors.textTertiary} />
            <Text style={styles.timeText}>{reportedAgo}</Text>
          </View>
        </View>

        {/* Timeline */}
        {!isRejected && <TimelineVisualization status={uiStatus} />}
        {isRejected && (
          <View style={styles.rejectedNote}>
            <Icon name="close" size={14} color={colors.statusRejected} />
            <Text style={styles.rejectedText}>
              This report was not accepted for verification
            </Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

// ── Timeline Visualization ───────────────────────────────────────

function TimelineVisualization({ status }: { status: IncidentStatus }) {
  const currentIndex = getStatusIndex(status);
  const milestones: IncidentStatus[] = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'];

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineTrack}>
        <View style={styles.timelineTrackBg} />
        {currentIndex >= 0 && (
          <View
            style={[
              styles.timelineTrackFill,
              {
                width: `${Math.min(
                  ((milestones.indexOf(status) >= 0
                    ? milestones.indexOf(status)
                    : currentIndex) /
                    (milestones.length - 1)) *
                    100,
                  100,
                )}%`,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.timelineLabels}>
        {milestones.map((milestone) => {
          const milestoneIndex = LIFECYCLE_ORDER.indexOf(milestone);
          const isCompleted = currentIndex >= milestoneIndex;
          const isCurrent = status === milestone;

          return (
            <View key={milestone} style={styles.timelineLabelItem}>
              <View
                style={[
                  styles.timelineDot,
                  isCompleted && styles.timelineDotCompleted,
                  isCurrent && styles.timelineDotCurrent,
                ]}
              />
              <Text
                style={[
                  styles.timelineLabelText,
                  isCompleted && styles.timelineLabelTextCompleted,
                  isCurrent && styles.timelineLabelTextCurrent,
                ]}
              >
                {milestone.replace(/_/g, ' ')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Loading State ─────────────────────────────────────────────────

function LoadingState() {
  return (
    <View style={styles.emptyState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.emptyTitle}>Loading your reports…</Text>
    </View>
  );
}

// ── Error State ──────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Icon name="info" size={32} color={colors.error} />
      <Text style={styles.emptyTitle}>Could not load reports</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.retryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────

function EmptyState({ filter }: { filter: ActivityFilter }) {
  return (
    <View style={styles.emptyState}>
      <Icon name="report" size={32} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {filter === 'resolved'
          ? 'No resolved reports yet'
          : filter === 'active'
            ? 'No active reports'
            : 'No reports submitted'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Reports you submit will appear here. Use the Report tab to submit your first issue.'
          : 'Try a different filter to see your reports.'}
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
  title: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing['2xs'],
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  summaryNumber: {
    ...typography.styles.heading,
    color: colors.text,
    fontSize: typography.fontSize.lg,
  },
  summaryLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },

  // Filters
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
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

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Report Card
  reportCardWrapper: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  reportCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  reportCard: {
    borderRadius: radius.xl,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderContent: {
    flex: 1,
  },
  reportTitle: {
    ...typography.styles.title,
    color: colors.text,
    marginBottom: spacing['2xs'],
  },
  reportCategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },

  // Timeline
  timeline: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  timelineTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  timelineTrackBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.borderLight,
  },
  timelineTrackFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineLabelItem: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineDotCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2,
    width: 10,
    height: 10,
  },
  timelineLabelText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },
  timelineLabelTextCompleted: {
    color: colors.primary,
    fontWeight: '500',
  },
  timelineLabelTextCurrent: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Rejected
  rejectedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rejectedText: {
    ...typography.styles.caption,
    color: colors.statusRejected,
    flex: 1,
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
    paddingHorizontal: spacing.md,
  },

  // Retry
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    ...typography.styles.label,
    color: colors.textOnPrimary,
  },

  // Trust Footer
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.infoLight,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  trustContent: {
    flex: 1,
    gap: spacing.xs,
  },
  trustTitle: {
    ...typography.styles.label,
    color: colors.text,
    fontWeight: '600',
  },
  trustText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
