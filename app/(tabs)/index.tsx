import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Card,
  StatusBadge,
  Icon,
  colors,
  radius,
  shadows,
  spacing,
  touchTarget,
  typography,
  type IconName,
} from '../../src/design';
import { CATEGORIES, formatReportedAgo, toUiStatus } from '../../src/constants/civic';
import { useAuth } from '../../src/services/auth';
import { fetchUserIncidents } from '../../src/services/incident';
import type { IncidentRow } from '../../src/services/incident';

// ── Briefing computation (real data only) ────────────────────────

interface BriefingStats {
  total: number;
  open: number;
  resolved: number;
  lastReportedAt: string | null;
}

function computeBriefing(incidents: IncidentRow[]): BriefingStats {
  const resolved = incidents.filter((i) => i.status === 'resolved').length;
  const rejected = incidents.filter((i) => i.status === 'rejected').length;
  const open = incidents.length - resolved - rejected;
  const sorted = [...incidents].sort(
    (a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
  );
  return {
    total: incidents.length,
    open,
    resolved,
    lastReportedAt: sorted[0]?.reported_at ?? null,
  };
}

// ── Quick Action ──────────────────────────────────────────────────

interface QuickActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  iconColor?: string;
  bgColor?: string;
}

function QuickAction({ icon, label, onPress, iconColor, bgColor }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: bgColor ?? colors.primaryLight },
        pressed && styles.quickActionPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={20} color={iconColor ?? colors.primary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

// ── Section Header ───────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Skeleton card (loading state) ────────────────────────────────

function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Card style={styles.incidentCard} padding="md" elevation="none">
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonIcon, { opacity: pulse }]} />
        <Animated.View style={[styles.skeletonBadge, { opacity: pulse }]} />
      </View>
      <Animated.View style={[styles.skeletonLine, { width: '88%', opacity: pulse }]} />
      <Animated.View style={[styles.skeletonLine, { width: '55%', opacity: pulse }]} />
      <View style={styles.skeletonFooter}>
        <Animated.View style={[styles.skeletonBadge, { opacity: pulse }]} />
      </View>
    </Card>
  );
}

// ── Incident Card (real data only) ───────────────────────────────

function IncidentCard({ incident }: { incident: IncidentRow }) {
  const router = useRouter();
  const meta = CATEGORIES[incident.category] ?? CATEGORIES.other;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/incident/[id]', params: { id: incident.id } })}
      style={({ pressed }) => [
        styles.incidentCard,
        styles.incidentCardPressable,
        pressed && styles.incidentCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${incident.title}. Status: ${incident.status}. Reported ${formatReportedAgo(incident.reported_at)}.`}
    >
      <View style={styles.incidentCardHeader}>
        <View style={[styles.incidentIconBadge, { backgroundColor: `${meta.color}1A` }]}>
          <Icon name={meta.icon} size={17} color={meta.color} />
        </View>
        <Text style={styles.incidentTime}>{formatReportedAgo(incident.reported_at)}</Text>
      </View>
      <Text style={styles.incidentTitle} numberOfLines={2}>
        {incident.title}
      </Text>
      <Text style={styles.incidentCategory} numberOfLines={1}>
        {meta.label}
      </Text>
      <View style={styles.incidentFooter}>
        <StatusBadge status={toUiStatus(incident.status)} size="sm" />
        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────

type DataState = 'idle' | 'loading' | 'ready' | 'error';

export default function HomeScreen() {
  const { status, profile } = useAuth();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const displayName = profile?.display_name?.split(' ')[0] ?? 'Citizen';

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [dataState, setDataState] = useState<DataState>('idle');

  const loadIncidents = useCallback(async () => {
    if (!isAuthenticated) {
      setIncidents([]);
      setDataState('idle');
      return;
    }
    setDataState('loading');
    const { incidents: rows, error } = await fetchUserIncidents();
    if (error) {
      setDataState('error');
      return;
    }
    setIncidents(rows);
    setDataState('ready');
  }, [isAuthenticated]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const briefing = useMemo(() => computeBriefing(incidents), [incidents]);

  const recentIncidents = useMemo(
    () =>
      [...incidents]
        .sort(
          (a, b) =>
            new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
        )
        .slice(0, 3),
    [incidents]
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.headerBar}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>
              {isAuthenticated ? `Assalam-o-Alaikum, ${displayName}` : 'Welcome to NigraanOS'}
            </Text>
            <Text style={styles.greetingSub}>
              {isAuthenticated
                ? "Here's what's happening with your civic reports."
                : 'Explore civic issues in your area. Sign in to report and track.'}
            </Text>
          </View>
          <Pressable
            style={styles.bellButton}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <Icon name="bell" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── AI Assistant entry ─────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.assistantEntry,
            pressed && styles.assistantEntryPressed,
          ]}
          // Route type is generated at dev-server start; assistant.tsx exists but
          // typed routes haven't been regenerated yet.
          onPress={() => router.push('/(tabs)/assistant' as Parameters<typeof router.push>[0])}
          accessibilityRole="button"
          accessibilityLabel="Open Civic Assistant to describe an issue"
        >
          <View style={styles.assistantIconBadge}>
            <Icon name="search" size={17} color={colors.textOnPrimary} />
          </View>
          <View style={styles.assistantTextBlock}>
            <Text style={styles.assistantTitle}>Civic Assistant</Text>
            <Text style={styles.assistantSubtitle} numberOfLines={1}>
              Describe an issue — get analysis and next steps
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} />
        </Pressable>

        {/* ── Civic Briefing (real data only) ────────────────── */}
        {isAuthenticated && dataState === 'ready' && briefing.total > 0 ? (
          <View style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <Icon name="activity" size={14} color={colors.accent} />
              <Text style={styles.briefingTitle}>Civic briefing</Text>
            </View>
            <Text style={styles.briefingBody}>
              You've reported {briefing.total} {briefing.total === 1 ? 'issue' : 'issues'} —{' '}
              {briefing.open > 0
                ? `${briefing.open} still open${briefing.resolved > 0 ? `, ${briefing.resolved} resolved` : ''}.`
                : briefing.resolved > 0
                  ? `all ${briefing.resolved} resolved. Well done.`
                  : 'none resolved yet.'}
            </Text>
            {briefing.lastReportedAt ? (
              <Text style={styles.briefingMeta}>
                Last report {formatReportedAgo(briefing.lastReportedAt)}
              </Text>
            ) : null}
          </View>
        ) : isAuthenticated && dataState === 'ready' && briefing.total === 0 ? (
          <View style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <Icon name="activity" size={14} color={colors.accent} />
              <Text style={styles.briefingTitle}>Civic briefing</Text>
            </View>
            <Text style={styles.briefingBody}>
              Your briefing builds as you report issues — spot something wrong
              in your area? Every report helps.
            </Text>
          </View>
        ) : !isAuthenticated ? (
          <View style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <Icon name="activity" size={14} color={colors.accent} />
              <Text style={styles.briefingTitle}>Civic briefing</Text>
            </View>
            <Text style={styles.briefingBody}>
              NigraanOS helps citizens report civic issues, follow their
              progress, and verify resolutions — building a shared picture of
              your city.
            </Text>
            <Pressable
              style={styles.briefingCta}
              onPress={() => router.push('/(auth)/welcome')}
              accessibilityRole="button"
              accessibilityLabel="Sign in to see your briefing"
            >
              <Text style={styles.briefingCtaText}>Sign in to build yours</Text>
              <Icon name="chevronRight" size={14} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}

        {/* ── Quick Actions ──────────────────────────────────── */}
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="report"
            label="Report issue"
            onPress={() => router.push('/(tabs)/report')}
          />
          <QuickAction
            icon="map"
            label="View map"
            onPress={() => router.push('/(tabs)/map')}
            iconColor={colors.info}
            bgColor={colors.infoLight}
          />
          <QuickAction
            icon="activity"
            label="My reports"
            onPress={() => router.push('/(tabs)/activity')}
            iconColor={colors.accent}
            bgColor={colors.accentLight}
          />
        </View>

        {/* ── Reports section ────────────────────────────────── */}
        <SectionHeader
          title={isAuthenticated ? 'Your reports' : 'Recent reports'}
          actionLabel={isAuthenticated ? 'See all' : 'Sign in'}
          onAction={() =>
            isAuthenticated
              ? router.push('/(tabs)/activity')
              : router.push('/(auth)/welcome')
          }
        />

        {/* Loading skeleton */}
        {isAuthenticated && dataState === 'loading' ? (
          <View style={styles.incidentsList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : null}

        {/* Recoverable error */}
        {isAuthenticated && dataState === 'error' ? (
          <Card style={styles.stateCard} padding="lg" elevation="none">
            <View style={styles.stateIconBadge}>
              <Icon name="error" size={20} color={colors.error} />
            </View>
            <Text style={styles.stateTitle}>Couldn't load your reports</Text>
            <Text style={styles.stateBody}>
              Check your connection and try again — your reports are safe.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={loadIncidents}
              accessibilityRole="button"
              accessibilityLabel="Retry loading reports"
            >
              <Icon name="refresh" size={15} color={colors.textOnPrimary} />
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </Card>
        ) : null}

        {/* Default: real incident cards */}
        {isAuthenticated && dataState === 'ready' && recentIncidents.length > 0 ? (
          <View style={styles.incidentsList}>
            {recentIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </View>
        ) : null}

        {/* Empty state */}
        {isAuthenticated && dataState === 'ready' && recentIncidents.length === 0 ? (
          <Card style={styles.stateCard} padding="lg" elevation="none">
            <View style={[styles.stateIconBadge, { backgroundColor: colors.successLight }]}>
              <Icon name="star" size={20} color={colors.success} />
            </View>
            <Text style={styles.stateTitle}>Your area looks quiet</Text>
            <Text style={styles.stateBody}>
              Nothing reported from you yet. If all's well, enjoy the calm —
              and if it isn't, you know what to do.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => router.push('/(tabs)/report')}
              accessibilityRole="button"
              accessibilityLabel="Report an issue"
            >
              <Icon name="plus" size={15} color={colors.textOnPrimary} />
              <Text style={styles.retryButtonText}>Report an issue</Text>
            </Pressable>
          </Card>
        ) : null}

        {/* Guest state */}
        {!isAuthenticated ? (
          <Card style={styles.stateCard} padding="lg" elevation="none">
            <View style={styles.stateIconBadge}>
              <Icon name="person" size={20} color={colors.primary} />
            </View>
            <Text style={styles.stateTitle}>Your reports live here</Text>
            <Text style={styles.stateBody}>
              Sign in to report issues, track their progress, and see your
              civic history in one place.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={() => router.push('/(auth)/welcome')}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.retryButtonText}>Sign in</Text>
              <Icon name="chevronRight" size={15} color={colors.textOnPrimary} />
            </Pressable>
          </Card>
        ) : null}

        {/* ── Bottom spacer ───────────────────────────────────── */}
        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTextBlock: {
    flex: 1,
  },
  greeting: {
    ...typography.styles.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  greetingSub: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  bellButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },

  // AI assistant entry
  assistantEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  assistantEntryPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  assistantIconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantTextBlock: {
    flex: 1,
  },
  assistantTitle: {
    ...typography.styles.label,
    color: colors.text,
    marginBottom: 2,
  },
  assistantSubtitle: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },

  // Civic briefing
  briefingCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  briefingTitle: {
    ...typography.styles.label,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  briefingBody: {
    ...typography.styles.bodySmall,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: typography.lineHeight.relaxed,
  },
  briefingMeta: {
    ...typography.styles.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: spacing.sm,
  },
  briefingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  briefingCtaText: {
    ...typography.styles.label,
    color: colors.accent,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  quickActionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  quickActionLabel: {
    ...typography.styles.caption,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.title,
    color: colors.text,
  },
  sectionAction: {
    ...typography.styles.label,
    color: colors.primary,
  },

  // Incident cards
  incidentsList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  incidentCard: {
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  incidentCardPressable: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  incidentCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  incidentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  incidentIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentTime: {
    ...typography.styles.caption,
    color: colors.textTertiary,
  },
  incidentTitle: {
    ...typography.styles.bodyMedium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  incidentCategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Skeletons
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  skeletonBadge: {
    width: 72,
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },

  // State cards (error / empty / guest)
  stateCard: {
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  stateIconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateTitle: {
    ...typography.styles.title,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  stateBody: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: touchTarget.comfortable,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    ...typography.styles.button,
    color: colors.textOnPrimary,
  },
});
