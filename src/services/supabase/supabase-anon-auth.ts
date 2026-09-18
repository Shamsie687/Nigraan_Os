/**
 * Supabase Anonymous Auth Service
 *
 * Provides temporary Supabase identity for local accounts.
 * Uses Supabase Anonymous Authentication to obtain a real user ID
 * that satisfies auth.uid() in RLS policies.
 *
 * REQUIREMENT: Anonymous Sign-Ins must be enabled in Supabase dashboard:
 * Authentication → Providers → Anonymous Sign-Ins → Enable
 *
 * Without this setting, signInAnonymously() will fail.
 */

import type { Session, User } from '@supabase/supabase-js';
import { supabase, getSupabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────────

export interface SupabaseIdentity {
  /** Supabase user ID (UUID) */
  userId: string;
  /** Whether this is an anonymous user */
  isAnonymous: boolean;
  /** Session access token */
  accessToken: string;
  /** Session refresh token */
  refreshToken: string;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Get the current Supabase session.
 * Returns null if no session exists or Supabase is not configured.
 */
export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[SupabaseAnon] Failed to get session:', error.message);
      return null;
    }
    return data.session;
  } catch (e) {
    console.warn('[SupabaseAnon] Exception getting session:', e);
    return null;
  }
}

/**
 * Sign in anonymously with Supabase.
 * Creates a new anonymous user in auth.users.
 *
 * Returns the Supabase identity or an error.
 */
export async function signInAnonymously(): Promise<{
  identity: SupabaseIdentity | null;
  error: Error | null;
}> {
  if (!supabase) {
    return {
      identity: null,
      error: new Error('Supabase is not configured'),
    };
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      // Check if anonymous auth is disabled
      if (
        error.message.includes('anonymous') ||
        error.message.includes('Anonymous') ||
        error.message.includes('provider')
      ) {
        return {
          identity: null,
          error: new Error(
            'Anonymous Sign-Ins are not enabled. ' +
              'Please enable in Supabase dashboard: ' +
              'Authentication → Providers → Anonymous Sign-Ins'
          ),
        };
      }
      return { identity: null, error: new Error(error.message) };
    }

    if (!data.session || !data.user) {
      return { identity: null, error: new Error('No session returned') };
    }

    return {
      identity: {
        userId: data.user.id,
        isAnonymous: data.user.is_anonymous ?? true,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
      error: null,
    };
  } catch (e) {
    return {
      identity: null,
      error: e instanceof Error ? e : new Error('Unknown error'),
    };
  }
}

/**
 * Refresh the Supabase session using the refresh token.
 */
export async function refreshSession(refreshToken: string): Promise<{
  identity: SupabaseIdentity | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { identity: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      // Session refresh failed — try signing in anonymously again
      return signInAnonymously();
    }

    return {
      identity: {
        userId: data.user.id,
        isAnonymous: data.user.is_anonymous ?? true,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
      error: null,
    };
  } catch (e) {
    // Fallback to new anonymous sign-in
    return signInAnonymously();
  }
}

/**
 * Sign out from Supabase.
 */
export async function signOutSupabase(): Promise<{ error: Error | null }> {
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Unknown error') };
  }
}

/**
 * Get the current Supabase user from the active session.
 */
export async function getCurrentSupabaseUser(): Promise<User | null> {
  const session = await getSupabaseSession();
  return session?.user ?? null;
}
