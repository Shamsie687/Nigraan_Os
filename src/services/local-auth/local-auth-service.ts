/**
 * Local Authentication Service with Supabase Identity
 *
 * Local account/session management that integrates with Supabase
 * Anonymous Authentication to provide real auth.uid() for RLS.
 *
 * Architecture:
 * - Local account stores display name and email (visible to user)
 * - Supabase anonymous user provides auth.uid() for database operations
 * - The NigraanOS backend signup/signin endpoints are the identity
 *   fallback when Supabase is unreachable, and they issue the session
 *   token used for authenticated API calls
 * - Both identities are stored together in AsyncStorage
 *
 * REQUIREMENT: Anonymous Sign-Ins must be enabled in Supabase dashboard:
 * Authentication → Providers → Anonymous Sign-Ins → Enable
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInAnonymously,
  refreshSession,
  signOutSupabase,
  getSupabaseSession,
  isSupabaseConfigured,
  type SupabaseIdentity,
} from '../supabase/supabase-anon-auth';
import { upsertProfile } from '../profile/profile-service';
import { buildApiUrl } from '../../lib/constants';

// ── Types ────────────────────────────────────────────────────────

export interface LocalUser {
  /** Supabase user ID (UUID) — used for auth.uid() in RLS */
  id: string;
  /** Display name */
  displayName: string;
  /** Email address */
  email: string;
  /** Account creation timestamp */
  createdAt: string;
  /** Supabase refresh token for session restoration */
  supabaseRefreshToken?: string;
  /** Backend-issued session token (bearer credential for API calls) */
  backendToken?: string;
  /** Whether the user has completed profile setup (name + preferences) */
  profileSetupCompleted?: boolean;
}

export interface LocalSession {
  user: LocalUser;
  /** Supabase identity for database operations */
  supabaseIdentity: SupabaseIdentity | null;
  /** Session creation timestamp */
  createdAt: string;
}

// ── Storage Keys ─────────────────────────────────────────────────

const STORAGE_KEYS = {
  /** Current active session */
  SESSION: '@nigraanos/session',
  /** All registered accounts (email -> LocalUser) */
  ACCOUNTS: '@nigraanos/accounts',
} as const;

// ── Helpers ──────────────────────────────────────────────────────

// ── Service ──────────────────────────────────────────────────────

/**
 * Get the current session from storage and verify Supabase session.
 * Returns null if no session exists.
 * If Supabase session is expired, attempts to refresh it.
 */
export async function getSession(): Promise<LocalSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;

    const session = JSON.parse(raw) as LocalSession;

    // If Supabase is configured, verify/refresh the Supabase session
    if (isSupabaseConfigured() && session.supabaseIdentity?.refreshToken) {
      const previousUserId = session.user.id;
      const supabaseSession = await getSupabaseSession();

      if (!supabaseSession) {
        // Supabase session expired or missing — try to refresh
        const { identity, error } = await refreshSession(
          session.supabaseIdentity.refreshToken
        );

        if (error || !identity) {
          // Get a new anonymous identity
          const newAnon = await signInAnonymously();
          if (newAnon.identity) {
            session.supabaseIdentity = newAnon.identity;
            session.user.id = newAnon.identity.userId;
            session.user.supabaseRefreshToken = newAnon.identity.refreshToken;
            await saveSession(session);

            // Update the stored account with new Supabase ID
            const accounts = await getAccounts();
            if (session.user.email in accounts) {
              accounts[session.user.email] = session.user;
              await saveAccounts(accounts);
            }
          }
        } else {
          session.supabaseIdentity = identity;
          session.user.id = identity.userId;
          session.user.supabaseRefreshToken = identity.refreshToken;
          await saveSession(session);
        }
      }

      // Identity rotation (refresh failure → new anonymous identity): the
      // new identity has no profiles row yet, and incidents.reporter_id
      // references profiles(id) — register it so report submissions don't
      // fail with a foreign-key violation.
      if (session.supabaseIdentity && session.user.id !== previousUserId) {
        const { error: profileError } = await upsertProfile(session.user.id, {
          displayName: session.user.displayName,
          email: session.user.email,
        });
        if (profileError) {
          console.warn(
            '[LocalAuth] Profile upsert after identity rotation failed:',
            profileError.message
          );
        }
      }
    }

    return session;
  } catch (e) {
    console.warn('[LocalAuth] Failed to get session:', e);
    return null;
  }
}

/**
 * Get all registered accounts.
 */
async function getAccounts(): Promise<Record<string, LocalUser>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LocalUser>;
  } catch {
    return {};
  }
}

/**
 * Save accounts to storage.
 */
async function saveAccounts(accounts: Record<string, LocalUser>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

/**
 * Save session to storage.
 */
async function saveSession(session: LocalSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

/**
 * Clear session from storage.
 */
async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
}

/**
 * Check if an account exists for the given email.
 */
export async function accountExists(email: string): Promise<boolean> {
  const accounts = await getAccounts();
  const normalizedEmail = email.toLowerCase().trim();
  return normalizedEmail in accounts;
}

// ── Backend auth ────────────────────────────────────────────────

/** Response body shape of the backend auth endpoints. */
type BackendSessionBody = {
  token?: unknown;
  user?: { id?: unknown } | null;
};

/**
 * Call a backend auth endpoint (signup or sign-in).
 *
 * Both endpoints return the same session token payload —
 * { success: true, token, user: { id, display_name, email } } — so a
 * single parser serves both. Every failure logs the full response
 * details (URL, status, body) to the console so connectivity issues
 * can be diagnosed from the dev tools.
 */
async function requestBackendSession(
  endpoint: '/auth/signup' | '/auth/signin',
  body: Record<string, unknown>
): Promise<{ userId: string | null; token: string | null; error: Error | null }> {
  const url = buildApiUrl(endpoint);

  try {
    // RN's fetch polyfill ignores AbortSignal — race a timeout instead.
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('request timed out after 10s')), 10_000)
      ),
    ]);

    const rawBody = await response.text();

    if (!response.ok) {
      console.error(`[LocalAuth] Backend ${endpoint} rejected`, {
        url,
        status: response.status,
        statusText: response.statusText,
        body: rawBody,
      });
      return {
        userId: null,
        token: null,
        error: new Error(`Request failed (${response.status} ${response.statusText})`),
      };
    }

    let parsed: BackendSessionBody | null = null;
    try {
      parsed = JSON.parse(rawBody) as BackendSessionBody;
    } catch (parseError) {
      console.error(`[LocalAuth] Backend ${endpoint} returned a non-JSON body`, {
        url,
        status: response.status,
        body: rawBody,
        parseError,
      });
      return {
        userId: null,
        token: null,
        error: new Error('Auth response could not be parsed'),
      };
    }

    const token = typeof parsed?.token === 'string' && parsed.token ? parsed.token : null;
    const userId =
      typeof parsed?.user?.id === 'string' && parsed.user.id ? parsed.user.id : null;

    if (!token || !userId) {
      console.error(`[LocalAuth] Backend ${endpoint} response is missing session fields`, {
        url,
        status: response.status,
        body: rawBody,
      });
      return {
        userId: null,
        token: null,
        error: new Error('Auth response was missing a session token'),
      };
    }

    console.log(`[LocalAuth] Backend ${endpoint} succeeded:`, { url, userId });
    return { userId, token, error: null };
  } catch (e) {
    console.error(`[LocalAuth] Backend ${endpoint} request failed`, { url, error: e });
    return {
      userId: null,
      token: null,
      error: e instanceof Error ? e : new Error('Auth request failed'),
    };
  }
}

/**
 * Read the best available session token for authenticated API calls.
 *
 * Prefers the Supabase access token (a JWT backing auth.uid() and RLS);
 * falls back to the backend-issued session token. Returns null when no
 * session exists or neither token is available — callers should then
 * submit without an Authorization header (public fallback).
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as LocalSession;
    return session.supabaseIdentity?.accessToken ?? session.user.backendToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a new account — Supabase anonymous identity when available,
 * with the NigraanOS backend signup endpoint as the identity fallback.
 * Returns the created user or an error.
 */
export async function createAccount(
  displayName: string,
  email: string
): Promise<{ user: LocalUser | null; supabaseIdentity: SupabaseIdentity | null; error: Error | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = displayName.trim();

  // Validate inputs
  if (!trimmedName || trimmedName.length < 2) {
    return { user: null, supabaseIdentity: null, error: new Error('Please enter your full name') };
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { user: null, supabaseIdentity: null, error: new Error('Please enter a valid email address') };
  }

  // Check if account already exists
  const accounts = await getAccounts();
  if (normalizedEmail in accounts) {
    return {
      user: null,
      supabaseIdentity: null,
      error: new Error('An account with this email already exists. Please sign in.'),
    };
  }

  // Establish a user identity. Supabase anonymous auth is preferred
  // (it provides auth.uid() for RLS); the backend signup endpoint is
  // the fallback so account setup still works when Supabase is
  // unreachable or not configured.
  let supabaseIdentity: SupabaseIdentity | null = null;
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    const result = await signInAnonymously();
    if (result.identity) {
      supabaseIdentity = result.identity;
      userId = result.identity.userId;
    } else {
      // Log the full error object — the message alone loses the cause.
      console.warn('[LocalAuth] Supabase anonymous auth failed:', result.error);
    }
  }

  // Backend-issued session token (set only when the backend provided
  // the identity — the Authorization credential for report submissions).
  let backendToken: string | null = null;

  if (!userId) {
    const backendResult = await requestBackendSession('/auth/signup', {
      displayName: trimmedName,
      email: normalizedEmail,
    });

    if (backendResult.userId) {
      userId = backendResult.userId;
      backendToken = backendResult.token;
    } else if (isSupabaseConfigured()) {
      // Both identity paths failed — surface a clear, actionable error
      // instead of stranding the user in a broken session.
      return {
        user: null,
        supabaseIdentity: null,
        error: new Error(
          'Could not reach NigraanOS services to set up your account. ' +
            'Please check your connection and try again.'
        ),
      };
    } else {
      // Supabase unconfigured and backend unreachable — keep the
      // offline-tolerant local-only ID.
      console.warn(
        '[LocalAuth] Backend signup unavailable, using local-only ID:',
        backendResult.error
      );
      userId = generateLocalId();
    }
  }

  // Create new user with Supabase user ID (or backend fallback ID)
  const newUser: LocalUser = {
    id: userId,
    displayName: trimmedName,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    supabaseRefreshToken: supabaseIdentity?.refreshToken,
    backendToken: backendToken ?? undefined,
  };

  // Save account
  accounts[normalizedEmail] = newUser;
  await saveAccounts(accounts);

  // Create session
  const session: LocalSession = {
    user: newUser,
    supabaseIdentity,
    createdAt: new Date().toISOString(),
  };
  await saveSession(session);

  return { user: newUser, supabaseIdentity, error: null };
}

/**
 * Sign in with an existing account.
 *
 * Restores/refreshes the Supabase session when possible and always
 * tries to obtain a fresh backend session token for API calls.
 * Returns the user or an error if account doesn't exist.
 */
export async function signIn(
  email: string
): Promise<{ user: LocalUser | null; supabaseIdentity: SupabaseIdentity | null; error: Error | null }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { user: null, supabaseIdentity: null, error: new Error('Please enter a valid email address') };
  }

  const accounts = await getAccounts();
  const storedUser = accounts[normalizedEmail];

  if (!storedUser) {
    return {
      user: null,
      supabaseIdentity: null,
      error: new Error('No account found with this email. Please create an account first.'),
    };
  }

  // Ensure identities are valid — Supabase anonymous session preferred,
  // with the backend session token as the fallback credential.
  let supabaseIdentity: SupabaseIdentity | null = null;
  let userId = storedUser.id;

  if (isSupabaseConfigured()) {
    // Try to restore or refresh Supabase session
    if (storedUser.supabaseRefreshToken) {
      const result = await refreshSession(storedUser.supabaseRefreshToken);
      if (result.identity) {
        supabaseIdentity = result.identity;
        userId = result.identity.userId;
      }
    } else {
      // No stored refresh token — get new anonymous identity
      const result = await signInAnonymously();
      if (result.identity) {
        supabaseIdentity = result.identity;
        userId = result.identity.userId;
      }
    }
  }

  // Backend session token — refreshes the bearer credential used for
  // authenticated report submissions, and covers accounts created via
  // the backend registration fallback (no Supabase identity).
  let backendToken = storedUser.backendToken ?? null;
  if (!supabaseIdentity) {
    const backendResult = await requestBackendSession('/auth/signin', {
      email: normalizedEmail,
      displayName: storedUser.displayName,
    });
    if (backendResult.token) {
      backendToken = backendResult.token;
    }
  }

  // Fail honestly only when no identity source could be reached.
  if (isSupabaseConfigured() && !supabaseIdentity && !backendToken) {
    return {
      user: null,
      supabaseIdentity: null,
      error: new Error(
        'Could not reach NigraanOS services to sign you in. ' +
          'Please check your connection and try again.'
      ),
    };
  }

  // Persist refreshed identities on the stored account
  storedUser.id = userId;
  if (supabaseIdentity) {
    storedUser.supabaseRefreshToken = supabaseIdentity.refreshToken;
  }
  if (backendToken) {
    storedUser.backendToken = backendToken;
  }
  if (supabaseIdentity || backendToken) {
    accounts[normalizedEmail] = storedUser;
    await saveAccounts(accounts);
  }

  // Create session
  const session: LocalSession = {
    user: storedUser,
    supabaseIdentity,
    createdAt: new Date().toISOString(),
  };
  await saveSession(session);

  return { user: storedUser, supabaseIdentity, error: null };
}

/**
 * Update the profile fields of the currently stored account and session.
 * Used by the profile-setup screen — persists the display name and
 * email across sessions and keeps the active session in sync.
 */
export async function updateLocalProfile(
  displayName: string,
  email: string
): Promise<{ user: LocalUser | null; error: Error | null }> {
  try {
    const session = await getSession();
    if (!session) {
      return { user: null, error: new Error('No active session. Please sign in again.') };
    }

    const trimmedName = displayName.trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { user: null, error: new Error('Please enter your full name') };
    }

    // Update the session user
    session.user.displayName = trimmedName;
    session.user.email = normalizedEmail;
    session.user.profileSetupCompleted = true;
    await saveSession(session);

    // Update the stored account entry (keyed by email — handle email change).
    // session.user carries the complete record including the refresh token.
    const accounts = await getAccounts();
    const oldEmail = Object.keys(accounts).find(
      (key) => accounts[key].id === session.user.id
    );
    if (oldEmail && oldEmail !== normalizedEmail) {
      delete accounts[oldEmail];
    }
    accounts[normalizedEmail] = session.user;
    await saveAccounts(accounts);

    return { user: session.user, error: null };
  } catch (e) {
    return {
      user: null,
      error: e instanceof Error ? e : new Error('Failed to save profile'),
    };
  }
}

/**
 * Sign out the current user.
 * Also signs out from Supabase.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    await clearSession();
    await signOutSupabase();
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Failed to sign out') };
  }
}

/**
 * Generate a local-only ID (fallback when Supabase is not available).
 */
function generateLocalId(): string {
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from({ length: len }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
    )
    .join('-');
}
