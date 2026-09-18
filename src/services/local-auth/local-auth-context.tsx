/**
 * Local Auth Context with Supabase Identity
 *
 * Drop-in replacement for the Supabase auth context.
 * Uses local storage for session persistence with Supabase anonymous
 * authentication for real auth.uid() in RLS policies.
 *
 * Exposes both:
 * - Local user information (displayName, email)
 * - Supabase identity (userId for auth.uid())
 *
 * The Supabase auth context remains in the codebase at ../auth/auth-context.tsx
 * and can be restored by updating the index.ts export.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getSession,
  createAccount,
  signIn,
  signOut,
  accountExists,
  updateLocalProfile,
  type LocalUser,
  type LocalSession,
} from './local-auth-service';
import type { SupabaseIdentity } from '../supabase/supabase-anon-auth';
import { upsertProfile } from '../profile/profile-service';

// ── Types ────────────────────────────────────────────────────────

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

/**
 * Profile data compatible with the rest of the app.
 */
export interface LocalProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: LocalProfile | null;
  isProfileComplete: boolean;
  isProfileLoading: boolean;
  /** Supabase identity for RLS-protected operations */
  supabaseIdentity: SupabaseIdentity | null;
  /** Whether Supabase integration is active */
  hasSupabaseIdentity: boolean;
}

interface AuthActions {
  /** Create a new local account with Supabase anonymous identity */
  createLocalAccount: (
    displayName: string,
    email: string
  ) => Promise<{ error: Error | null }>;

  /** Sign in with existing local account */
  signInLocal: (email: string) => Promise<{ error: Error | null }>;

  /** Check if account exists for email */
  checkAccountExists: (email: string) => Promise<boolean>;

  /** Sign out */
  signOut: () => Promise<{ error: Error | null }>;

  /** Get the current Supabase user ID for auth.uid() operations */
  getSupabaseUserId: () => string | null;

  // Legacy methods (stubs for compatibility)
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (email: string, code: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: {
    displayName: string;
    email: string;
    phone?: string;
    city?: string;
    province?: string;
  }) => Promise<{ error: Error | null }>;
  reloadProfile: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

// ── Context ──────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Convert LocalUser to a Supabase-compatible User object.
 * Uses the Supabase user ID if available, otherwise falls back to local ID.
 */
function toSupabaseUser(localUser: LocalUser): User {
  return {
    id: localUser.id, // This is the Supabase user ID if anonymous auth worked
    email: localUser.email,
    phone: '',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: localUser.createdAt,
    created_at: localUser.createdAt,
    updated_at: localUser.createdAt,
    app_metadata: { provider: 'local' },
    user_metadata: {
      display_name: localUser.displayName,
      email: localUser.email,
    },
    identities: [],
    is_anonymous: true,
  } as User;
}

/**
 * Convert LocalUser to a Profile object.
 */
function toProfile(localUser: LocalUser): LocalProfile {
  return {
    id: localUser.id,
    display_name: localUser.displayName,
    email: localUser.email,
    phone: null,
    city: 'Karachi',
    province: 'Sindh',
    created_at: localUser.createdAt,
    updated_at: localUser.createdAt,
  };
}

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
    user: null,
    profile: null,
    isProfileComplete: false,
    isProfileLoading: false,
    supabaseIdentity: null,
    hasSupabaseIdentity: false,
  });

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    getSession().then((session: LocalSession | null) => {
      if (!mounted) return;

      if (session) {
        const user = toSupabaseUser(session.user);
        const profile = toProfile(session.user);
        const isProfileComplete = session.user.profileSetupCompleted === true;
        setState({
          status: 'authenticated',
          session: session.supabaseIdentity
            ? ({
                user,
                access_token: session.supabaseIdentity.accessToken,
                refresh_token: session.supabaseIdentity.refreshToken,
              } as Session)
            : null,
          user,
          profile,
          isProfileComplete,
          isProfileLoading: false,
          supabaseIdentity: session.supabaseIdentity,
          hasSupabaseIdentity: session.supabaseIdentity !== null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          status: 'unauthenticated',
          isProfileLoading: false,
        }));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const createLocalAccount: AuthActions['createLocalAccount'] = useCallback(
    async (displayName: string, email: string) => {
      const { user, supabaseIdentity, error } = await createAccount(displayName, email);
      if (error || !user) {
        return { error };
      }

      // Create Supabase profile (ensures FK for future incident creation)
      if (supabaseIdentity) {
        const { error: profileError } = await upsertProfile(supabaseIdentity.userId, {
          displayName: user.displayName,
          email: user.email,
        });
        if (profileError) {
          console.warn('[AuthContext] Profile upsert failed:', profileError.message);
          // Non-blocking: local account still works, profile can be created later
        }
      }

      const supabaseUser = toSupabaseUser(user);
      const profile = toProfile(user);
      setState({
        status: 'authenticated',
        session: supabaseIdentity
          ? ({
              user: supabaseUser,
              access_token: supabaseIdentity.accessToken,
              refresh_token: supabaseIdentity.refreshToken,
            } as Session)
          : null,
        user: supabaseUser,
        profile,
        // New accounts complete profile setup before entering the app
        isProfileComplete: false,
        isProfileLoading: false,
        supabaseIdentity,
        hasSupabaseIdentity: supabaseIdentity !== null,
      });

      return { error: null };
    },
    []
  );

  const signInLocal: AuthActions['signInLocal'] = useCallback(async (email: string) => {
    const { user, supabaseIdentity, error } = await signIn(email);
    if (error || !user) {
      return { error };
    }

    // Ensure Supabase profile exists (may need re-creation if anonymous identity changed)
    if (supabaseIdentity) {
      const { error: profileError } = await upsertProfile(supabaseIdentity.userId, {
        displayName: user.displayName,
        email: user.email,
      });
      if (profileError) {
        console.warn('[AuthContext] Profile upsert on sign-in failed:', profileError.message);
      }
    }

    const supabaseUser = toSupabaseUser(user);
    const profile = toProfile(user);
    setState({
      status: 'authenticated',
      session: supabaseIdentity
        ? ({
            user: supabaseUser,
            access_token: supabaseIdentity.accessToken,
            refresh_token: supabaseIdentity.refreshToken,
          } as Session)
        : null,
      user: supabaseUser,
      profile,
      // Returning accounts keep their existing setup state
      isProfileComplete: user.profileSetupCompleted === true,
      isProfileLoading: false,
      supabaseIdentity,
      hasSupabaseIdentity: supabaseIdentity !== null,
    });

    return { error: null };
  }, []);

  const checkAccountExists: AuthActions['checkAccountExists'] = useCallback(
    async (email: string) => {
      return accountExists(email);
    },
    []
  );

  const signOutAction: AuthActions['signOut'] = useCallback(async () => {
    const { error } = await signOut();
    if (!error) {
      setState({
        status: 'unauthenticated',
        session: null,
        user: null,
        profile: null,
        isProfileComplete: false,
        isProfileLoading: false,
        supabaseIdentity: null,
        hasSupabaseIdentity: false,
      });
    }
    return { error };
  }, []);

  const getSupabaseUserId: AuthActions['getSupabaseUserId'] = useCallback(() => {
    return state.supabaseIdentity?.userId ?? state.user?.id ?? null;
  }, [state.supabaseIdentity, state.user]);

  // Legacy stubs (not used in local auth flow)
  const legacyError = { error: new Error('Not available in local auth mode') };
  const signInWithPhone = useCallback(async () => legacyError, []);
  const verifyOtp = useCallback(async () => legacyError, []);
  const signInWithEmail = useCallback(async () => legacyError, []);
  const verifyEmailOtp = useCallback(async () => legacyError, []);

  /**
   * Update the profile — persists display name/email locally and keeps
   * the Supabase profile row in sync when a Supabase identity exists.
   * Marks profile setup complete on success.
   */
  const updateProfileAction: AuthActions['updateProfile'] = useCallback(
    async (data) => {
      const { user, error } = await updateLocalProfile(data.displayName, data.email);
      if (error || !user) {
        return { error };
      }

      // Keep the Supabase profile row in sync (non-blocking on failure —
      // the local record remains authoritative for the session)
      if (state.supabaseIdentity) {
        const { error: profileError } = await upsertProfile(
          state.supabaseIdentity.userId,
          {
            displayName: user.displayName,
            email: user.email,
            phone: data.phone,
          }
        );
        if (profileError) {
          console.warn('[AuthContext] Profile upsert failed:', profileError.message);
        }
      }

      const supabaseUser = toSupabaseUser(user);
      const profile = toProfile(user);
      setState((prev) => ({
        ...prev,
        user: supabaseUser,
        profile,
        isProfileComplete: true,
      }));

      return { error: null };
    },
    [state.supabaseIdentity]
  );

  const reloadProfile = useCallback(async () => {}, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      createLocalAccount,
      signInLocal,
      checkAccountExists,
      signOut: signOutAction,
      getSupabaseUserId,
      signInWithPhone,
      verifyOtp,
      signInWithEmail,
      verifyEmailOtp,
      updateProfile: updateProfileAction,
      reloadProfile,
    }),
    [
      state,
      createLocalAccount,
      signInLocal,
      checkAccountExists,
      signOutAction,
      getSupabaseUserId,
      signInWithPhone,
      verifyOtp,
      signInWithEmail,
      verifyEmailOtp,
      updateProfileAction,
      reloadProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
