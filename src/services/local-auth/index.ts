/**
 * Local Auth Service
 *
 * Local account management integrated with Supabase Anonymous Authentication.
 * Provides real auth.uid() for RLS-protected database operations.
 *
 * The Supabase OTP auth code is preserved at ../auth/auth-context.tsx
 */

export { AuthProvider, useAuth } from './local-auth-context';
export type { AuthStatus, LocalProfile } from './local-auth-context';
export {
  getSession,
  createAccount,
  signIn,
  signOut,
  accountExists,
  type LocalUser,
  type LocalSession,
} from './local-auth-service';
