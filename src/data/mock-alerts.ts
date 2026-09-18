/**
 * Mock Alert Data for NigraanOS
 *
 * This file contains mock alert data used during the product-skeleton stage.
 * Alerts are distinct from incidents:
 * - Alert: Something users should know about (awareness)
 * - Incident: A reported civic issue (issue tracking)
 *
 * Replace with real backend queries when integration is ready.
 * All guidance fields are MOCK DATA for demonstration purposes only.
 */

import type { IconName } from '../design';

// ── Types ────────────────────────────────────────────────────────

export type AlertCategory =
  | 'flooding'
  | 'roads'
  | 'water'
  | 'electricity'
  | 'safety'
  | 'traffic';

export type AlertSeverity = 'info' | 'moderate' | 'high' | 'critical';

export type AlertStatus = 'active' | 'resolved' | 'escalating';

export interface MockAlert {
  id: string;
  category: AlertCategory;
  title: string;
  explanation: string;
  severity: AlertSeverity;
  status: AlertStatus;
  affectedArea: string;
  reportedAgo: string;
  /** Mock guidance: what the user should do */
  guidance: string;
  /** Whether this alert is simulated/nearby (mock) */
  isNearby: boolean;
}

// ── Category Config ──────────────────────────────────────────────

export interface AlertCategoryConfig {
  label: string;
  icon: IconName;
  color: string;
}

export const ALERT_CATEGORY_CONFIG: Record<AlertCategory, AlertCategoryConfig> = {
  flooding: { label: 'Flooding', icon: 'water', color: '#1565C0' },
  roads: { label: 'Road Closure', icon: 'road', color: '#795548' },
  water: { label: 'Water Supply', icon: 'water', color: '#00838F' },
  electricity: { label: 'Power', icon: 'electricity', color: '#F57C00' },
  safety: { label: 'Safety', icon: 'alert', color: '#D32F2F' },
  traffic: { label: 'Traffic', icon: 'road', color: '#5F6368' },
};

// ── Severity Config ──────────────────────────────────────────────

export const ALERT_SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; color: string; bgColor: string }
> = {
  info: { label: 'Info', color: '#1565C0', bgColor: '#E3F2FD' },
  moderate: { label: 'Moderate', color: '#E65100', bgColor: '#FFF3E0' },
  high: { label: 'High', color: '#D32F2F', bgColor: '#FFEBEE' },
  critical: { label: 'Critical', color: '#B71C1C', bgColor: '#FFCDD2' },
};

// ── Status Config ────────────────────────────────────────────────

export const ALERT_STATUS_CONFIG: Record<
  AlertStatus,
  { label: string; color: string }
> = {
  active: { label: 'Active', color: '#E65100' },
  escalating: { label: 'Escalating', color: '#D32F2F' },
  resolved: { label: 'Resolved', color: '#1B5E20' },
};

// ── Mock Data ────────────────────────────────────────────────────

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: 'a1',
    category: 'flooding',
    title: 'Street flooding on Shahrah-e-Faisal',
    explanation:
      'Moderate to heavy rainfall has caused water accumulation on the service lane. Standing water is 6-8 inches deep in some sections. Drainage crews have been dispatched.',
    severity: 'high',
    status: 'active',
    affectedArea: 'Shahrah-e-Faisal Service Lane, near Drigh Road',
    reportedAgo: '45 minutes ago',
    guidance: 'Avoid the affected lane. Use the main carriageway or alternative routes via University Road.',
    isNearby: true,
  },
  {
    id: 'a2',
    category: 'water',
    title: 'Water supply disruption in PECHS',
    explanation:
      'Scheduled maintenance on the K-IV water pipeline is temporarily disrupting supply to PECHS Blocks 2, 3, and 6. Work is expected to complete by evening.',
    severity: 'moderate',
    status: 'active',
    affectedArea: 'PECHS Blocks 2, 3, and 6',
    reportedAgo: '3 hours ago',
    guidance: 'Conserve stored water. Water tankers are being coordinated for affected areas.',
    isNearby: false,
  },
  {
    id: 'a3',
    category: 'electricity',
    title: 'Extended power outage in Gulshan-e-Iqbal',
    explanation:
      'A transformer failure has caused a prolonged blackout affecting approximately 200 households. K-Electric has been notified but response is delayed.',
    severity: 'high',
    status: 'escalating',
    affectedArea: 'Gulshan-e-Iqbal Block 4 and surrounding areas',
    reportedAgo: '1 day ago',
    guidance: 'Use alternative lighting. Keep refrigerator doors closed to preserve food. Report if you have medical equipment dependent on power.',
    isNearby: false,
  },
  {
    id: 'a4',
    category: 'traffic',
    title: 'Major traffic blockage on MA Jinnah Road',
    explanation:
      'A broken-down truck is blocking two lanes near the Saddar intersection. Traffic is backed up for approximately 2 km. Traffic police are on site.',
    severity: 'moderate',
    status: 'active',
    affectedArea: 'MA Jinnah Road near Saddar',
    reportedAgo: '1 hour ago',
    guidance: 'Avoid MA Jinnah Road during peak hours. Use I.I. Chundrigar Road or Shahrah-e-Liaquat as alternatives.',
    isNearby: true,
  },
  {
    id: 'a5',
    category: 'safety',
    title: 'Public safety advisory: Stray dog activity',
    explanation:
      'Multiple reports of aggressive stray dog packs near park areas. Municipal authorities have been notified and animal control is being coordinated.',
    severity: 'moderate',
    status: 'active',
    affectedArea: 'Jail Road Park and surrounding residential blocks',
    reportedAgo: '2 days ago',
    guidance: 'Supervise children outdoors. Avoid walking alone in affected areas after dusk. Report aggressive encounters.',
    isNearby: false,
  },
  {
    id: 'a6',
    category: 'roads',
    title: 'Road closure: Bridge maintenance',
    explanation:
      'The Nagan Chowrangi flyover bridge is closed for scheduled structural maintenance. The closure is expected to last 3 days.',
    severity: 'info',
    status: 'active',
    affectedArea: 'Nagan Chowrangi flyover',
    reportedAgo: '6 hours ago',
    guidance: 'Use ground-level roundabout. Expect 10-15 minute delays during peak hours.',
    isNearby: false,
  },
  {
    id: 'a7',
    category: 'flooding',
    title: 'Low-lying area flood warning',
    explanation:
      'Weather forecast predicts continued rainfall. Low-lying areas near Lyari River are at risk of flash flooding within 6-8 hours.',
    severity: 'critical',
    status: 'escalating',
    affectedArea: 'Areas adjacent to Lyari River, Lyari and Keamari',
    reportedAgo: '2 hours ago',
    guidance: 'Prepare to evacuate if in flood-prone areas. Move valuables to upper floors. Avoid crossing flowing water.',
    isNearby: false,
  },
  {
    id: 'a8',
    category: 'electricity',
    title: 'Load shedding schedule update',
    explanation:
      'K-Electric has announced extended load shedding for several areas due to grid maintenance. Outages may last 4-6 hours per area.',
    severity: 'info',
    status: 'active',
    affectedArea: 'Multiple areas including North Nazimabad, Nazimabad',
    reportedAgo: '5 hours ago',
    guidance: 'Charge essential devices. Keep flashlights ready. Check K-Electric website for area-specific schedules.',
    isNearby: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Find an alert by ID from the mock data.
 * Replace with backend query when integration is ready.
 */
export function findMockAlert(id: string): MockAlert | undefined {
  return MOCK_ALERTS.find((a) => a.id === id);
}

/**
 * Get alerts filtered by category.
 */
export function getAlertsByCategory(category: AlertCategory | 'all'): MockAlert[] {
  if (category === 'all') return MOCK_ALERTS;
  return MOCK_ALERTS.filter((a) => a.category === category);
}

/**
 * Get critical alerts.
 */
export function getCriticalAlerts(): MockAlert[] {
  return MOCK_ALERTS.filter((a) => a.severity === 'critical' || a.severity === 'high');
}

/**
 * Get nearby alerts (mock).
 */
export function getNearbyAlerts(): MockAlert[] {
  return MOCK_ALERTS.filter((a) => a.isNearby);
}
