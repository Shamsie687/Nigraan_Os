// ── Incident Query Service ────────────────────────────────────────
//
// Query functions for fetching incidents from Supabase.
// Used by Activity screen (user's own incidents), Incident Detail
// screen (single incident by ID), and Civic Map (community incidents).
//
// RLS ensures users can only see their own incidents via direct queries.
// The map uses a SECURITY DEFINER RPC that returns only safe columns.

import { getSupabase } from '../supabase';
import type { IncidentRow } from './incident-model';

// ── Types ─────────────────────────────────────────────────────────

export interface FetchUserIncidentsResult {
  incidents: IncidentRow[];
  error: string | null;
}

export interface FetchIncidentResult {
  incident: IncidentRow | null;
  error: string | null;
}

/**
 * Map-safe incident row returned by the community map RPC.
 * Contains only the columns needed for map display —
 * never exposes reporter_id, location_accuracy, or other sensitive data.
 */
export interface MapIncidentRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  reported_at: string;
  updated_at: string;
}

export interface FetchMapIncidentsResult {
  incidents: MapIncidentRow[];
  error: string | null;
}

// ── Service Functions ─────────────────────────────────────────────

/**
 * Fetch all incidents for the current authenticated user.
 * Ordered by reported_at descending (newest first).
 *
 * RLS ensures only the user's own incidents are returned.
 */
export async function fetchUserIncidents(): Promise<FetchUserIncidentsResult> {
  try {
    const { data, error } = await getSupabase()
      .from('incidents')
      .select('*')
      .order('reported_at', { ascending: false });

    if (error) {
      return { incidents: [], error: error.message };
    }

    return { incidents: (data as IncidentRow[]) ?? [], error: null };
  } catch (e) {
    return {
      incidents: [],
      error: e instanceof Error ? e.message : 'Failed to fetch incidents',
    };
  }
}

/**
 * Fetch a single incident by ID.
 * RLS ensures the user can only fetch their own incidents.
 *
 * @param id - The incident UUID
 */
export async function fetchIncidentById(id: string): Promise<FetchIncidentResult> {
  try {
    const { data, error } = await getSupabase()
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = no rows returned
      if (error.code === 'PGRST116') {
        return { incident: null, error: null };
      }
      return { incident: null, error: error.message };
    }

    return { incident: data as IncidentRow, error: null };
  } catch (e) {
    return {
      incident: null,
      error: e instanceof Error ? e.message : 'Failed to fetch incident',
    };
  }
}

/**
 * Fetch community incidents for the civic map.
 *
 * Calls the SECURITY DEFINER function get_map_incidents() which
 * bypasses RLS to return all non-rejected incidents, but only
 * exposes map-safe columns (no reporter_id, no location_accuracy).
 */
export async function fetchMapIncidents(): Promise<FetchMapIncidentsResult> {
  try {
    const { data, error } = await getSupabase()
      .rpc('get_map_incidents');

    if (error) {
      return { incidents: [], error: error.message };
    }

    return { incidents: (data as MapIncidentRow[]) ?? [], error: null };
  } catch (e) {
    return {
      incidents: [],
      error: e instanceof Error ? e.message : 'Failed to fetch map incidents',
    };
  }
}
