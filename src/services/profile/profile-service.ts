import { getSupabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────────

/**
 * Profile record from the profiles table.
 * Matches the database schema defined in the migration.
 */
export interface Profile {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to create or update a profile.
 */
export interface ProfileData {
  displayName: string;
  email?: string;
  phone?: string;
}

// ── Service ──────────────────────────────────────────────────────

/**
 * Fetch the current user's profile from the database.
 * Returns null if no profile exists or user is not authenticated.
 *
 * RLS ensures this only returns the authenticated user's profile.
 */
export async function fetchProfile(): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .single();

  if (error) {
    // PGRST116 = no rows returned (profile doesn't exist yet)
    if (error.code === 'PGRST116') {
      return { data: null, error: null };
    }
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Profile, error: null };
}

/**
 * Create or update the current user's profile.
 * Uses upsert to handle both initial creation and updates.
 *
 * RLS ensures:
 * - Users can only create profiles with their own ID
 * - Users can only update their own profile
 *
 * @param userId - The authenticated user's ID (from auth.users)
 * @param profileData - The profile data to save
 */
export async function upsertProfile(
  userId: string,
  profileData: ProfileData,
): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: profileData.displayName,
        email: profileData.email ?? null,
        phone: profileData.phone ?? null,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Profile, error: null };
}

/**
 * Update specific fields of the current user's profile.
 * Only updates the provided fields, leaving others unchanged.
 *
 * RLS ensures users can only update their own profile.
 *
 * @param updates - Partial profile data to update
 */
export async function updateProfileFields(
  updates: Partial<Omit<ProfileData, 'phone'>>,
): Promise<{ data: Profile | null; error: Error | null }> {
  const updatePayload: Record<string, unknown> = {};

  if (updates.displayName !== undefined) {
    updatePayload.display_name = updates.displayName;
  }
  if (updates.email !== undefined) {
    updatePayload.email = updates.email;
  }

  const { data, error } = await getSupabase()
    .from('profiles')
    .update(updatePayload)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Profile, error: null };
}
