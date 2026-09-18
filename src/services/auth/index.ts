/**
 * Auth Service
 *
 * Currently using local authentication for the hackathon build.
 * To restore Supabase authentication, uncomment the Supabase export below.
 */

// Local auth (temporary for hackathon)
export { AuthProvider, useAuth } from '../local-auth/local-auth-context';
export type { AuthStatus } from '../local-auth/local-auth-context';

// Supabase auth (preserved — uncomment to restore)
// export { AuthProvider, useAuth } from './auth-context';
// export type { AuthStatus } from './auth-context';
