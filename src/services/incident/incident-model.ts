// ── Incident Database Model ──────────────────────────────────────
//
// TypeScript types matching the incidents table schema defined in
// database/migrations/20260902_create_incidents_table.sql.
//
// Field names use snake_case to match Supabase/PostgreSQL responses.
// Status and category values use lowercase to match database CHECK constraints.
// The shared domain types (shared/types/incident.ts) use UPPER_CASE for
// application-layer constants — mapping can be added in a service layer.

// ── Enums ────────────────────────────────────────────────────────

/**
 * Incident categories supported by the system.
 * Matches the CHECK constraint on incidents.category.
 */
export const INCIDENT_CATEGORIES = [
  'water',
  'flooding',
  'roads',
  'waste',
  'electricity',
  'air_quality',
  'healthcare',
  'education',
  'public_safety',
  'emergency',
  'other',
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

/**
 * Incident lifecycle statuses.
 * Matches the CHECK constraint on incidents.status.
 *
 * Citizens may only create incidents with status 'reported'.
 * All other transitions are handled by system/authority workflows.
 */
export const INCIDENT_STATUSES = [
  'reported',
  'ai_analyzed',
  'corroborated',
  'verified',
  'in_progress',
  'resolved',
  'rejected',
] as const;

export type IncidentStatusDb = (typeof INCIDENT_STATUSES)[number];

/**
 * Statuses that citizens are allowed to set.
 * Only 'reported' — all other statuses require authority/system action.
 */
export const CITIZEN_ALLOWED_STATUSES: readonly IncidentStatusDb[] = ['reported'];

// ── Database Row ─────────────────────────────────────────────────

/**
 * Incident row as returned from the database via Supabase.
 * Matches the public.incidents table schema.
 */
export interface IncidentRow {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatusDb;
  latitude: number;
  longitude: number;
  location_accuracy: number | null;
  reported_at: string;
  updated_at: string;
}

// ── Insert/Update Payloads ───────────────────────────────────────

/**
 * Data required to create a new incident.
 * Reporter ID is derived from the authenticated session (never from client).
 * Status is always 'reported' for citizen-created incidents.
 */
export interface CreateIncidentPayload {
  title: string;
  description: string;
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
}

/**
 * Fields that a citizen can update on their own incident.
 * - Cannot change reporter_id (prevents impersonation)
 * - Cannot set status beyond 'reported' (prevents privilege escalation)
 * - Cannot change reported_at (set by database default)
 */
export interface UpdateIncidentPayload {
  title?: string;
  description?: string;
  category?: IncidentCategory;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
}

// ── Validation Constants ─────────────────────────────────────────

/**
 * Field constraints matching the database CHECK constraints.
 * Use these for client-side validation before sending to the database.
 */
export const INCIDENT_CONSTRAINTS = {
  title: { minLength: 3, maxLength: 200 },
  description: { minLength: 10, maxLength: 5000 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
  locationAccuracy: { min: 0 },
} as const;
