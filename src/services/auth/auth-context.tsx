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
import { supabase, getSupabase } from '../supabase';
import { fetchProfile, upsertProfile, type Profile, type ProfileData } from '../profile';

// ── Types ────────────────────────────────────────────────────────

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthState {
  /** Current authentication status */
  status: AuthStatus;
  /** Supabase session when authenticated, null otherwise */
  session: Session | null;
  /** Supabase user when authenticated, null otherwise */
  user: User | null;
  /** User profile from the profiles table, null if not yet created */
  profile: Profile | null;
  /** Whether profile setup is complete (profile exists in database) */
  isProfileComplete: boolean;
  /** Whether profile data is currently loading */
  isProfileLoading: boolean;
}

interface AuthActions {
  /**
   * Send an OTP to the given phone number.
   * Called from the phone entry screen.
   */
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;

  /**
   * Verify the OTP code for phone-based auth and establish a session.
   * Called from the OTP verification screen.
   */
  verifyOtp: (phone: string, code: string) => Promise<{ error: Error | null }>;

  /**
   * Send an email OTP to the given email address.
   * Called from the email entry screen.
   */
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;

  /**
   * Verify the email OTP code and establish an authenticated session.
   * Called from the OTP verification screen for email-based auth.
   */
  verifyEmailOtp: (email: string, code: string) => Promise<{ error: Error | null }>;

  /**
   * Create or update the user's profile in the profiles table.
   * Called from profile setup and settings.
   *
   * RLS ensures users can only create/update their own profile.
   */
  updateProfile: (data: ProfileData) => Promise<{ error: Error | null }>;

  /**
   * Reload the profile from the database.
   * Useful after profile updates from other screens.
   */
  reloadProfile: () => Promise<void>;

  /**
   * Clear the current session and return to unauthenticated state.
   */
  signOut: () => Promise<{ error: Error | null }>;
}

type AuthContextValue = AuthState & AuthActions;

// ── Context ──────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────

/**
 * AuthProvider — wraps the app and provides centralized auth state.
 *
 * On mount, restores any persisted Supabase session and listens for
 * auth state changes (sign-in, sign-out, token refresh).
 *
 * When authenticated, fetches the user's profile from the profiles table.
 * Profile completeness is determined by whether a profile record exists.
 *
 * Session persistence is handled by Supabase via AsyncStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
    user: null,
    profile: null,
    isProfileComplete: false,
    isProfileLoading: false,
  });

  // Fetch profile for the given user
  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        profile: null,
        isProfileComplete: false,
        isProfileLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProfileLoading: true }));

    const { data: profile, error } = await fetchProfile();

    setState((prev) => ({
      ...prev,
      profile,
      isProfileComplete: profile !== null,
      isProfileLoading: false,
    }));

    if (error) {
      console.error('[AuthProvider] Failed to fetch profile:', error.message);
    }
  }, []);

  // Restore session on mount and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    // If Supabase is not configured, set unauthenticated immediately
    if (!supabase) {
      if (mounted) {
        setState((prev) => ({
          ...prev,
          status: 'unauthenticated',
        }));
      }
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState((prev) => ({
        ...prev,
        status: session ? 'authenticated' : 'unauthenticated',
        session,
        user,
      }));
      // Fetch profile if authenticated
      if (user) {
        loadProfile(user);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      setState((prev) => ({
        ...prev,
        status: session ? 'authenticated' : 'unauthenticated',
        session,
        user,
      }));
      // Fetch profile if authenticated, clear if not
      loadProfile(user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithPhone: AuthActions['signInWithPhone'] = useCallback(async (phone: string) => {
    const { error } = await getSupabase().auth.signInWithOtp({ phone });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const verifyOtp: AuthActions['verifyOtp'] = useCallback(async (phone: string, code: string) => {
    const { error } = await getSupabase().auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signInWithEmail: AuthActions['signInWithEmail'] = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.signInWithOtp({ email });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const verifyEmailOtp: AuthActions['verifyEmailOtp'] = useCallback(async (email: string, code: string) => {
    const { error } = await getSupabase().auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const updateProfile: AuthActions['updateProfile'] = useCallback(
    async (data: ProfileData) => {
      const user = state.user;
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      // Upsert profile to the database
      const { error: upsertError } = await upsertProfile(user.id, data);
      if (upsertError) {
        return { error: upsertError };
      }

      // Also update auth user metadata for quick access
      await getSupabase().auth.updateUser({
        data: {
          display_name: data.displayName,
          email: data.email,
        },
      });

      // Reload profile to update context state
      await loadProfile(user);

      return { error: null };
    },
    [state.user, loadProfile],
  );

  const reloadProfile: AuthActions['reloadProfile'] = useCallback(async () => {
    await loadProfile(state.user);
  }, [state.user, loadProfile]);

  const signOut: AuthActions['signOut'] = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    return { error: error ? new Error(error.message) : null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithPhone,
      verifyOtp,
      signInWithEmail,
      verifyEmailOtp,
      updateProfile,
      reloadProfile,
      signOut,
    }),
    [state, signInWithPhone, verifyOtp, signInWithEmail, verifyEmailOtp, updateProfile, reloadProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * useAuth — access the current auth state and actions.
 *
 * Must be used within an <AuthProvider>. Throws if used outside.
 *
 * Usage:
 *   const { status, user, profile, isProfileComplete, signOut } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
