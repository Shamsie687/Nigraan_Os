/**
 * NigraanOS Civic Constants
 *
 * Single source of truth for category configuration, status mappings,
 * and date formatting used across multiple screens.
 *
 * Eliminates duplication of CATEGORY_META / FULL_CATEGORY_CONFIG /
 * DB_TO_UI_STATUS that were previously defined independently in
 * activity.tsx, incident/[id].tsx, and map.tsx.
 */

import type { IconName } from '../design';
import type { IncidentStatus } from '../design';

// ── Category Configuration ─────────────────────────────────────────

export interface CategoryMeta {
  label: string;
  icon: IconName;
  color: string;
}

/**
 * Category metadata used by all screens that display incident categories.
 * Colors are category-specific accents (not part of the core palette)
 * so they live here rather than in the color token file.
 */
export const CATEGORIES: Record<string, CategoryMeta> = {
  water:         { label: 'Water supply',           icon: 'water',       color: '#00838F' },
  flooding:      { label: 'Flooding',               icon: 'water',       color: '#1565C0' },
  roads:         { label: 'Roads & streets',        icon: 'road',        color: '#795548' },
  waste:         { label: 'Waste & garbage',        icon: 'delete',      color: '#5F6368' },
  electricity:   { label: 'Electricity',            icon: 'electricity', color: '#F57C00' },
  air_quality:   { label: 'Air quality',             icon: 'wind',        color: '#4CAF50' },
  healthcare:    { label: 'Healthcare',               icon: 'activity',    color: '#E91E63' },
  education:     { label: 'Education',                icon: 'book',        color: '#3F51B5' },
  public_safety: { label: 'Public safety',            icon: 'shield',      color: '#FF5722' },
  emergency:     { label: 'Emergency',                icon: 'emergency',   color: '#D32F2F' },
  other:         { label: 'Other',                  icon: 'report',      color: '#5F6368' },
};

// ── DB Status → UI Status Mapping ──────────────────────────────────

const DB_TO_UI_STATUS: Record<string, IncidentStatus> = {
  reported: 'REPORTED',
  ai_analyzed: 'AI_ANALYZED',
  corroborated: 'CORROBORATED',
  verified: 'VERIFIED',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  rejected: 'REJECTED',
};

/** Convert a raw database status string to the UI IncidentStatus type. */
export function toUiStatus(dbStatus: string): IncidentStatus {
  return DB_TO_UI_STATUS[dbStatus] ?? 'REPORTED';
}

// ── Date Formatting ────────────────────────────────────────────────

/** Format an ISO timestamp into a human-friendly relative time string. */
export function formatReportedAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
