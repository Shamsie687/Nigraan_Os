import { Stack } from 'expo-router';
import { colors } from '../../src/design';

/**
 * Auth flow layout — a clean stack navigator for authentication screens.
 *
 * No headers: each screen manages its own back/navigation UI.
 * White background across all auth screens for a calm, focused experience.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
      }}
    >
      {/* Local auth screens (current) */}
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="forgot-password" />

      {/* Supabase auth screens (preserved for future restoration) */}
      <Stack.Screen name="choose-method" />
      <Stack.Screen name="email" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
