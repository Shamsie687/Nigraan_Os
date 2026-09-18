/**
 * Mock User Activity Data for NigraanOS
 *
 * This file contains mock data representing reports submitted by the
 * currently authenticated user. Replace with real Supabase queries
 * filtered by reporter_id when backend integration is ready.
 *
 * All data is MOCK for the product-skeleton stage.
 */

import type { IconName } from '../design';
import type { IncidentStatus } from '../design/components/StatusBadge';

// ── Types ────────────────────────────────────────────────────────

export type UserReportCategory =
  | 'roads'
  | 'flooding'
  | 'water'
  | 'electricity'
  | 'waste';

export type UserReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface UserReport {
  id: string;
  category: UserReportCategory;
  title: string;
  area: string;
  /** ISO date string or relative time */
  reportedAt: string;
  status: IncidentStatus;
  severity: UserReportSeverity;
}

// ── Category Config (reuse from mock-incidents) ──────────────────

export const REPORT_CATEGORY_CONFIG: Record<
  UserReportCategory,
  { label: string; icon: IconName; color: string }
> = {
  roads: { label: 'Roads', icon: 'road', color: '#795548' },
  flooding: { label: 'Flooding', icon: 'water', color: '#1565C0' },
  water: { label: 'Water', icon: 'water', color: '#00838F' },
  electricity: { label: 'Power', icon: 'electricity', color: '#F57C00' },
  waste: { label: 'Waste', icon: 'building', color: '#5F6368' },
};

// ── Severity Config ──────────────────────────────────────────────

export const REPORT_SEVERITY_CONFIG: Record<
  UserReportSeverity,
  { color: string; label: string }
> = {
  low: { color: '#5F6368', label: 'Low' },
  medium: { color: '#E65100', label: 'Medium' },
  high: { color: '#D32F2F', label: 'High' },
  critical: { color: '#B71C1C', label: 'Critical' },
};

// ── Lifecycle Statuses ───────────────────────────────────────────

export const LIFECYCLE_ORDER: IncidentStatus[] = [
  'REPORTED',
  'AI_ANALYZED',
  'CORROBORATED',
  'VERIFIED',
  'IN_PROGRESS',
  'RESOLVED',
];

/**
 * Get the progress index for a status (0-based).
 * Returns -1 for REJECTED (terminal state).
 */
export function getStatusIndex(status: IncidentStatus): number {
  if (status === 'REJECTED') return -1;
  const idx = LIFECYCLE_ORDER.indexOf(status);
  return idx >= 0 ? idx : -1;
}

// ── Mock User Reports ────────────────────────────────────────────

/**
 * Mock reports belonging to the current authenticated user.
 * In production, these would be queried by reporter_id = auth.uid().
 */
export const MOCK_USER_REPORTS: UserReport[] = [
  {
    id: 'm1',
    category: 'roads',
    title: 'Road blockage near Gulberg signal',
    area: 'Main Boulevard, Gulberg',
    reportedAt: '2 days ago',
    status: 'IN_PROGRESS',
    severity: 'medium',
  },
  {
    id: 'm3',
    category: 'water',
    title: 'Water supply disruption',
    area: 'PECHS Block 2',
    reportedAt: '4 days ago',
    status: 'VERIFIED',
    severity: 'medium',
  },
  {
    id: 'm5',
    category: 'waste',
    title: 'Garbage pile-up near park',
    area: 'Jail Road Park Entrance',
    reportedAt: '1 week ago',
    status: 'RESOLVED',
    severity: 'low',
  },
  {
    id: 'u1',
    category: 'electricity',
    title: 'Flickering street lights at night',
    area: 'Gulshan-e-Iqbal Block 7',
    reportedAt: '3 days ago',
    status: 'CORROBORATED',
    severity: 'medium',
  },
  {
    id: 'u2',
    category: 'flooding',
    title: 'Drain overflow near home',
    area: 'North Nazimabad Block H',
    reportedAt: '5 days ago',
    status: 'AI_ANALYZED',
    severity: 'high',
  },
  {
    id: 'u3',
    category: 'roads',
    title: 'Missing manhole cover',
    area: 'Shahrah-e-Pakistan',
    reportedAt: '2 weeks ago',
    status: 'REJECTED',
    severity: 'high',
  },
];

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Get all user reports.
 */
export function getUserReports(): UserReport[] {
  return MOCK_USER_REPORTS;
}

/**
 * Get active reports (not resolved or rejected).
 */
export function getActiveReports(): UserReport[] {
  return MOCK_USER_REPORTS.filter(
    (r) => r.status !== 'RESOLVED' && r.status !== 'REJECTED'
  );
}

/**
 * Get resolved reports.
 */
export function getResolvedReports(): UserReport[] {
  return MOCK_USER_REPORTS.filter((r) => r.status === 'RESOLVED');
}

/**
 * Count active reports.
 */
export function countActiveReports(): number {
  return getActiveReports().length;
}

/**
 * Count resolved reports.
 */
export function countResolvedReports(): number {
  return getResolvedReports().length;
}
