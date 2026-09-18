/**
 * Civic Intelligence Map
 *
 * Displays community incidents from Supabase on an interactive map.
 * - Native (Android/iOS): react-native-maps with Google/Apple tiles
 * - Web: react-leaflet with OpenStreetMap tiles
 *
 * Data: fetches community incidents via the SECURITY DEFINER
 * get_map_incidents() RPC, which returns only map-safe columns
 * (no reporter_id, no location_accuracy). Tapping a marker shows
 * a detail card; "View details" navigates to the incident detail screen.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
} from '../../src/design';
import {
  CATEGORIES,
  toUiStatus,
  formatReportedAgo,
} from '../../src/constants/civic';
import {
  fetchMapIncidents,
  type MapIncidentRow,
  type IncidentCategory,
} from '../../src/services/incident';
import {
  CivicMap,
  DEFAULT_REGION,
  type CivicMapMarker,
} from '../../src/components/CivicMap';

// ── Types ──────────────────────────────────────────────────────────

type DataState = 'idle' | 'loading' | 'ready' | 'error';

const FILTER_CATEGORIES: Array<IncidentCategory | 'all'> = [
  'all', 'roads', 'flooding', 'water', 'electricity', 'waste',
  'air_quality', 'healthcare', 'education', 'public_safety', 'emergency', 'other',
];

// ── Helpers ────────────────────────────────────────────────────────

/** True if the incident has a valid GPS coordinate. */
function hasValidCoords(i: MapIncidentRow): boolean {
  return i.latitude !== 0 || i.longitude !== 0;
}

/** Convert a MapIncidentRow to a CivicMapMarker. */
function toMarker(i: MapIncidentRow): CivicMapMarker {
  const meta = CATEGORIES[i.category] ?? CATEGORIES.other;
  return {
    id: i.id,
    latitude: i.latitude,
    longitude: i.longitude,
    title: i.title,
    category: i.category,
    color: meta.color,
    iconName: meta.icon,
  };
}

// ── Main Screen ────────────────────────────────────────────────────

export default function MapScreen() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<MapIncidentRow[]>([]);
  const [dataState, setDataState] = useState<DataState>('idle');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');
  const [selectedIncident, setSelectedIncident] = useState<MapIncidentRow | null>(null);

  // ── Data loading ──────────────────────────────────────────────

  const loadIncidents = useCallback(async () => {
    setDataState('loading');
    const { incidents: rows, error } = await fetchMapIncidents();
    if (error) {
      setDataState('error');
      return;
    }
    setIncidents(rows);
    setDataState('ready');
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // ── Derived data ──────────────────────────────────────────────

  const mapIncidents = useMemo(
    () => incidents.filter(hasValidCoords),
    [incidents],
  );

  const filteredIncidents = useMemo(() => {
    if (selectedCategory === 'all') return mapIncidents;
    return mapIncidents.filter((i) => i.category === selectedCategory);
  }, [mapIncidents, selectedCategory]);

  const markers: CivicMapMarker[] = useMemo(
    () => filteredIncidents.map(toMarker),
    [filteredIncidents],
  );

  // ── Category filters shown (only those that have incidents) ───

  const activeCategories = useMemo(() => {
    const cats = new Set(mapIncidents.map((i) => i.category));
    return FILTER_CATEGORIES.filter(
      (c) => c === 'all' || cats.has(c),
    );
  }, [mapIncidents]);

  // ── Stats ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const newCount = filteredIncidents.filter((i) => i.status === 'reported').length;
    const activeCount = filteredIncidents.filter(
      (i) => !['resolved', 'rejected'].includes(i.status),
    ).length - newCount;
    const resolvedCount = filteredIncidents.filter(
      (i) => i.status === 'resolved',
    ).length;
    return { newCount, activeCount: Math.max(0, activeCount), resolvedCount };
  }, [filteredIncidents]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleMarkerSelect = useCallback(
    (marker: CivicMapMarker | null) => {
      if (!marker) {
        setSelectedIncident(null);
        return;
      }
      const incident = filteredIncidents.find((i) => i.id === marker.id) ?? null;
      setSelectedIncident((prev) => (prev?.id === incident?.id ? null : incident));
    },
    [filteredIncidents],
  );

  // ── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Civic Map</Text>
            <Text style={styles.subtitle}>
              {dataState === 'ready'
                ? `${filteredIncidents.length} ${filteredIncidents.length === 1 ? 'issue' : 'issues'} with location`
                : 'Loading incidents…'}
            </Text>
          </View>
          <Pressable
            style={styles.refreshBtn}
            onPress={loadIncidents}
            accessibilityRole="button"
            accessibilityLabel="Refresh incidents"
          >
            {dataState === 'loading' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="refresh" size={18} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {/* ── Category Filters ─────────────────────────────────── */}
        {activeCategories.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {activeCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              const meta = cat === 'all' ? null : CATEGORIES[cat];
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={meta?.label ?? 'All categories'}
                >
                  {meta && (
                    <Icon
                      name={meta.icon}
                      size={14}
                      color={isActive ? colors.textOnPrimary : meta.color}
                    />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {meta?.label ?? 'All'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* ── Map Area ─────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        {/* The map always renders — incidents load as markers on top of it,
            and failures surface as an overlay rather than hiding the map. */}
        <CivicMap
          markers={markers}
          selectedMarkerId={selectedIncident?.id ?? null}
          onMarkerSelect={handleMarkerSelect}
          region={DEFAULT_REGION}
        />

        {/* Loading overlay */}
        {dataState === 'loading' && incidents.length === 0 ? (
          <View style={styles.stateOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateLabel}>Loading incidents…</Text>
          </View>
        ) : null}

        {/* Load-failure card — floats over the map so it stays explorable */}
        {dataState === 'error' ? (
          <View style={styles.errorOverlay}>
            <Card padding="lg" elevation="md" style={styles.errorCard}>
              <Icon name="error" size={28} color={colors.error} />
              <Text style={styles.stateTitle}>Couldn't load incidents</Text>
              <Text style={styles.stateBody}>
                Check your connection and try again.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.retryButtonPressed,
                ]}
                onPress={loadIncidents}
                accessibilityRole="button"
                accessibilityLabel="Retry loading incidents"
              >
                <Icon name="refresh" size={15} color={colors.textOnPrimary} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </Card>
          </View>
        ) : null}

        {/* ── Empty map overlay ────────────────────────────────── */}
        {dataState === 'ready' && markers.length === 0 ? (
          <View style={styles.emptyOverlay}>
            <Card padding="md" elevation="sm" style={styles.emptyCard}>
              <Icon name="map" size={20} color={colors.textTertiary} />
              <Text style={styles.emptyText}>
                {selectedCategory !== 'all'
                  ? `No ${CATEGORIES[selectedCategory]?.label ?? ''} issues with location data.`
                  : 'No incidents with location data yet.\nReport an issue with GPS enabled to see it here.'}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* ── Legend ──────────────────────────────────────────── */}
        {dataState === 'ready' && markers.length > 0 ? (
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.statusReported }]} />
                <Text style={styles.legendText}>Reported</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.statusInProgress }]} />
                <Text style={styles.legendText}>In Progress</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.statusResolved }]} />
                <Text style={styles.legendText}>Resolved</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Incident Detail Card ─────────────────────────────── */}
      {selectedIncident ? (
        <IncidentDetailCard
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onViewDetails={() => {
            router.push({ pathname: '/incident/[id]', params: { id: selectedIncident.id } });
            setSelectedIncident(null);
          }}
        />
      ) : null}

      {/* ── Bottom Stats Bar ─────────────────────────────────── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.newCount}</Text>
          <Text style={styles.statLabel}>New</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {stats.resolvedCount}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Incident Detail Card ───────────────────────────────────────────

function IncidentDetailCard({
  incident,
  onClose,
  onViewDetails,
}: {
  incident: MapIncidentRow;
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const meta = CATEGORIES[incident.category] ?? CATEGORIES.other;

  return (
    <View style={styles.detailOverlay}>
      <Card padding="lg" elevation="lg" style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View style={[styles.detailIcon, { backgroundColor: meta.color + '20' }]}>
            <Icon name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.detailHeaderContent}>
            <Text style={styles.detailTitle} numberOfLines={2}>
              {incident.title}
            </Text>
            <Text style={styles.detailCategory}>{meta.label}</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.detailCloseBtn}
            accessibilityRole="button"
            accessibilityLabel="Close details"
          >
            <Icon name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>

        <Text style={styles.detailDescription} numberOfLines={3}>
          {incident.description}
        </Text>

        <View style={styles.detailMeta}>
          <StatusBadge status={toUiStatus(incident.status)} size="sm" />
        </View>

        <View style={styles.detailFooter}>
          <Icon name="clock" size={12} color={colors.textTertiary} />
          <Text style={styles.detailTime}>
            {formatReportedAgo(incident.reported_at)}
          </Text>
          <Pressable
            onPress={onViewDetails}
            style={styles.viewDetailsBtn}
            accessibilityRole="button"
            accessibilityLabel="View full incident details"
          >
            <Text style={styles.viewDetailsText}>View details</Text>
            <Icon name="forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

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
  headerTextBlock: {
    flex: 1,
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
  refreshBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
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

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },

  // Loading / error / empty states
  stateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
    backgroundColor: 'rgba(248, 249, 250, 0.85)',
  },
  errorOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  errorCard: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  stateLabel: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  stateTitle: {
    ...typography.styles.title,
    color: colors.text,
    textAlign: 'center',
  },
  stateBody: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
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
    marginTop: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    ...typography.styles.button,
    color: colors.textOnPrimary,
  },

  // Empty overlay
  emptyOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  emptyText: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: typography.lineHeight.relaxed,
  },

  // Legend
  legend: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },

  // Detail overlay
  detailOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  detailCard: {
    borderRadius: radius.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderContent: {
    flex: 1,
  },
  detailTitle: {
    ...typography.styles.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing['2xs'],
  },
  detailCategory: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  detailDescription: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.md,
  },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailTime: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    flex: 1,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  viewDetailsText: {
    ...typography.styles.label,
    color: colors.primary,
    fontWeight: '600',
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  statNumber: {
    ...typography.styles.heading,
    color: colors.text,
    fontSize: typography.fontSize.lg,
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
});
