import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/services/auth';
import { colors } from '../src/design';
import { BrandedSplash } from '../src/components/BrandedSplash';

/**
 * Root layout — wraps the entire application.
 *
 * Provides the AuthProvider for centralized auth state,
 * then delegates navigation gating to RootNavigator.
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * RootNavigator — manages navigation based on auth status.
 *
 * Architecture:
 * - Both (auth) and (tabs) route groups are always registered.
 * - Tabs are shown on top for all users (public explore).
 * - Protected tabs (Report, Activity, Profile) show a sign-in gate
 *   when the user is not authenticated.
 * - Auth group is entered when the user taps "Sign in" from a gate.
 * - After successful auth, the user is redirected back to tabs.
 * - Profile-setup is enforced: authenticated users without a complete
 *   profile are redirected to the profile-setup screen.
 */
function RootNavigator() {
  const { status, user, isProfileComplete } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const isRestoringSession = status === 'loading';

  useEffect(() => {
    if (isRestoringSession) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (status === 'authenticated' && isProfileComplete) {
      // Fully authenticated — ensure in tabs group
      if (!inTabsGroup) {
        router.replace('/(tabs)');
      }
    } else if (status === 'authenticated' && !isProfileComplete) {
      // Authenticated but profile setup incomplete — stay in auth group
      if (!inAuthGroup || segments[1] !== 'profile-setup') {
        const params: Record<string, string> = {};
        if (user?.phone) params.phone = user.phone;
        if (user?.email) params.email = user.email;
        router.replace({ pathname: '/(auth)/profile-setup', params });
      }
    }
    // Unauthenticated users stay wherever they are (tabs by default).
    // They enter the auth group only by explicit navigation (sign-in gate).
  }, [status, user, isProfileComplete, segments, isRestoringSession]);

  // ── Branded splash while restoring session ───────────────────
  // Deep Forest field with the gold wordmark; no artificial delay —
  // it shows exactly as long as session restoration takes.
  if (isRestoringSession) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <BrandedSplash />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {/* ── Both route groups always available ────────────────── */}
      {/* (auth) group: welcome, sign-in, create-account, forgot-password,
          profile-setup (+ preserved OTP screens) */}
      {/* (tabs) group: home, map, report, alerts, activity, profile */}
      {/* Tabs render on top — unauthenticated users explore freely,
          protected tabs show a sign-in prompt when tapped. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="incident/[id]" />
      </Stack>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
  },
});
