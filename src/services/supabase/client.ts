import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Environment variables ────────────────────────────────────────

/**
 * Normalize the configured Supabase project URL.
 *
 * supabase-js appends its own product paths (`/auth/v1`, `/rest/v1`,
 * `/storage/v1`), so the value must be the bare project URL. Dashboard
 * copies sometimes include a `/rest/v1/` suffix — strip it (and any
 * trailing slashes) so requests never hit an invalid path
 * ("Invalid path specified in request URL").
 */
function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest|auth|storage)\/v1$/, '');
}

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl ? normalizeSupabaseUrl(rawSupabaseUrl) : undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ── Supabase client ──────────────────────────────────────────────

/**
 * Supabase client instance configured for the mobile app.
 *
 * - Uses AsyncStorage for session persistence (Expo-compatible).
 * - Auto-refreshes tokens on expiry.
 * - Only uses the anon/publishable key (never service-role).
 *
 * If environment variables are missing, this will be null.
 * Operations will fail at runtime with a descriptive error.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/**
 * Returns the Supabase client or throws if not configured.
 * Use this in service functions to get a clear error message.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. ' +
        'Please create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'See .env.example for the expected format.'
    );
  }
  return supabase;
}
