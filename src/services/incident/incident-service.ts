// ── Incident Service ─────────────────────────────────────────────
//
// Service layer for incident CRUD operations.
//
// Security notes:
// - reporter_id is derived from auth.uid() (never from client)
// - Status is always 'reported' for citizen-created incidents
// - RLS policies enforce ownership

import { getSupabase } from '../supabase';
import {
  type IncidentRow,
  type CreateIncidentPayload,
} from './incident-model';

// ── Service Types ────────────────────────────────────────────────

/**
 * Result of an incident creation operation.
 */
export interface CreateIncidentResult {
  success: boolean;
  incident?: IncidentRow;
  error?: string;
}

// ── Error Mapping ────────────────────────────────────────────────

/**
 * Translate raw Postgres/PostgREST errors into honest, actionable
 * messages. The raw error is logged for debugging — users never see
 * database internals.
 */
function toFriendlyError(error: { code?: string; message?: string }): string {
  const code = error.code ?? '';
  const message = error.message ?? '';

  // PGRST205 — table missing from the schema (service not provisioned)
  if (code === 'PGRST205') {
    return (
      'The NigraanOS reports service is not fully set up yet. ' +
      'Please try again later.'
    );
  }

  // 23503 — foreign key violation: reporter_id references profiles(id).
  // Happens when the citizen's profile row is not registered server-side.
  if (code === '23503') {
    return (
      "Your citizen profile isn't registered on the server yet. " +
      'Please sign out and sign in again, then resubmit your report.'
    );
  }

  // 42501 — RLS violation: session identity does not match reporter_id
  if (code === '42501') {
    return (
      'Your session could not be verified. Please sign out and sign in ' +
      'again, then resubmit your report.'
    );
  }

  // Network-layer failures (offline, DNS, timeout)
  if (
    message.includes('Failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('Network request failed')
  ) {
    return (
      'No connection. Check your internet and try again — ' +
      'your report is still here.'
    );
  }

  return 'Failed to submit report. Please try again.';
}

// ── Service Functions ────────────────────────────────────────────

/**
 * Create a new incident report.
 *
 * The reporter_id is automatically set to the authenticated user's ID.
 * Status is always 'reported' — enforced by the database RLS policy.
 *
 * @param payload - The incident data (title, description, category, location)
 * @returns The created incident record, or an error
 */
export async function createIncident(
  payload: CreateIncidentPayload
): Promise<CreateIncidentResult> {
  // Read the locally persisted session instead of auth.getUser():
  // getUser() performs a server round-trip that can fail on flaky
  // connections even when the session is valid, aborting otherwise
  // healthy submissions. RLS still validates the token server-side
  // on the insert itself, and supabase-js refreshes expired tokens
  // automatically before the request goes out.
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return {
      success: false,
      error:
        'Your session has expired. Please sign out and sign in again, ' +
        'then resubmit your report.',
    };
  }

  // Build the full row — reporter_id from session, status always 'reported'
  const row: Omit<IncidentRow, 'id' | 'updated_at'> & { status: 'reported' } = {
    reporter_id: user.id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    status: 'reported',
    latitude: payload.latitude,
    longitude: payload.longitude,
    location_accuracy: payload.location_accuracy ?? null,
    reported_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabase()
    .from('incidents')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.warn(
      '[IncidentService] createIncident failed:',
      error.code ?? '(no code)',
      error.message
    );
    return {
      success: false,
      error: toFriendlyError(error),
    };
  }

  return {
    success: true,
    incident: data as IncidentRow,
  };
}
